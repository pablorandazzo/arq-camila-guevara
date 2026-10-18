import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const site = JSON.parse(await readFile(new URL('../src/content/site.json', import.meta.url), 'utf8'));
const catalogs = {};
for (const kind of ['projects', 'articles']) {
  const dir = new URL(`../src/content/${kind}/`, import.meta.url);
  catalogs[kind] = await Promise.all((await readdir(dir)).filter(name => name.endsWith('.json')).map(async name => ({ id: name.slice(0, -5), ...JSON.parse(await readFile(new URL(name, dir), 'utf8')) })));
}

test('all migrated records have unique ordering and real image files', async () => {
  assert.equal(catalogs.projects.length, 25);
  assert.equal(catalogs.articles.length, 18);
  for (const entries of Object.values(catalogs)) {
    assert.equal(new Set(entries.map(item => item.order)).size, entries.length);
    for (const item of entries) {
      assert.ok(item.title && item.alt && item.image.startsWith('/assets/images/'), item.id);
      await access(new URL(`../${item.image.slice(1)}`, import.meta.url));
      for (const section of item.sections || []) {
        assert.ok(['image', 'text', 'quote'].includes(section.type), `${item.id}: section type`);
        if (section.type === 'image') {
          assert.ok(section.alt && section.image.startsWith('/assets/images/'), item.id);
          await access(new URL(`../${section.image.slice(1)}`, import.meta.url));
        }
      }
    }
  }
});

test('featured links resolve to catalog entries', () => {
  const intro = site.home.sections.find(section => section.type === 'home_intro');
  const journal = site.home.sections.find(section => section.type === 'home_journal');
  for (const [ids, kind] of [[intro.featuredProjects, 'projects'], [journal.featuredArticles, 'articles']]) {
    for (const id of ids) assert.ok(catalogs[kind].some(item => item.id === id), id);
  }
});

test('source attribution identifies the design credit without mislabeling the original site', () => {
  assert.equal(site.brand, 'Studio RHE');
  assert.equal(site.creditLabel, 'Diseño web: Outpost');
  assert.equal(site.creditUrl, 'https://www.discoveroutpost.com/');
});

test('CMS exposes every site singleton field in its matching section', async () => {
  const config = await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8');
  assert.equal((config.match(/- name: sections\n\s+label:/g) || []).length, 6, 'projects, articles and four pages share section blocks');
  for (const type of ['image', 'text', 'quote']) assert.equal((config.match(new RegExp(`- name: ${type}\\n\\s+label:`, 'g')) || []).length, 6, type);
  const singleton = config.slice(config.indexOf('  - name: pages'));
  assert.match(singleton, /- name: site\s+label:.*\s+file: src\/content\/site\.json\s+fields:/);
  const sections = ['home', 'about', 'contact', 'privacy'];
  const firstSection = singleton.indexOf('          - name: home');
  assert.ok(firstSection > 0);
  for (const key of Object.keys(site).filter(key => !sections.includes(key))) {
    assert.match(singleton.slice(0, firstSection), new RegExp(`name: ${key}(?:,|\\n)`), key);
  }
  for (const [index, section] of sections.entries()) {
    const start = singleton.indexOf(`          - name: ${section}`);
    const end = index + 1 < sections.length ? singleton.indexOf(`          - name: ${sections[index + 1]}`) : singleton.length;
    assert.ok(start >= 0 && end > start, section);
    const fields = singleton.slice(start, end);
    assert.match(fields, /widget: object/);
    for (const key of Object.keys(site[section])) {
      assert.match(fields, new RegExp(`name: ${key}(?:,|\\n)`), `${section}.${key}`);
    }
    for (const block of site[section].sections) {
      assert.ok(fields.includes(`- name: ${block.type}\n`), `${section}.${block.type}`);
    }
  }
});

test('fresh build emits catalog routes and legacy redirect contracts', async () => {
  await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url)), 'build'], {
    cwd: fileURLToPath(root), maxBuffer: 2 * 1024 * 1024,
  });
  for (const [route, values] of [
    ['index.html', [site.brand, site.menu[1], site.home.sections[0].intro, site.creditLabel]],
    ['about/index.html', [site.about.sections[0].title, site.about.sections[1].text]],
    ['contact/index.html', [site.contact.sections[0].statement, site.contact.sections[0].email]],
    ['privacy/index.html', [site.privacy.sections[0].text, site.privacy.sections[0].linkText]],
  ]) {
    const html = await readFile(new URL(`../dist/${route}`, import.meta.url), 'utf8');
    for (const value of values) assert.ok(html.includes(value), `${route}: ${value}`);
    if (route !== 'privacy/index.html') {
      assert.match(html, /<noscript><nav class="nojs-nav" aria-label="Menú principal">/);
      for (const path of ['/', '/about/', '/projects/', '/journal/', '/contact/']) {
        assert.ok(html.includes(`<a href="${path}"`), `${route}: no-script navigation ${path}`);
      }
    }
  }
  for (const [kind, route] of [['projects', 'projects'], ['articles', 'journal']]) {
    for (const item of catalogs[kind]) {
      const page = await readFile(new URL(`../dist/${route}/${item.id}/index.html`, import.meta.url), 'utf8');
      assert.ok(page.includes(item.title), `${route}/${item.id}`);
    }
  }
  for (const [category, label] of [['resorts', 'Turísticos'], ['commercial', 'Comerciales']]) {
    const html = await readFile(new URL(`../dist/projects/${category}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`href="/projects/${category}/" aria-current="page"`), category);
    assert.ok(html.includes(label), category);
    const titles = catalogs.projects.filter(project => project.category === category).map(project => project.title);
    assert.equal((html.match(/class="project-choice/g) || []).length, titles.length, category);
    for (const title of titles) assert.ok(html.includes(title), title);
    assert.match(html, /<img src="\/assets\/images\/[^\"]+"[^>]*loading="eager"[^>]*fetchpriority="high"/);
    assert.equal((html.match(/loading="eager"/g) || []).length, titles.length, category);
    assert.equal((html.match(/data-src="\/assets\/images\//g) || []).length, titles.length - 1, category);
    assert.equal((html.match(/class="projects-mobile-list"/g) || []).length, 1, category);
    assert.equal((html.match(/loading="lazy"/g) || []).length, titles.length, category);
  }
  const listing = await readFile(new URL('../dist/projects/index.html', import.meta.url), 'utf8');
  assert.equal((listing.match(/class="project-choice/g) || []).length, catalogs.projects.length);
  assert.equal((listing.match(/loading="eager"/g) || []).length, catalogs.projects.length);
  assert.equal((listing.match(/data-src="\/assets\/images\//g) || []).length, catalogs.projects.length - 1);
  assert.equal((listing.match(/loading="lazy"/g) || []).length, catalogs.projects.length);
  assert.match(listing, /href="\/projects\/" aria-current="page"/);
  const detail = await readFile(new URL('../dist/projects/zil-residences/index.html', import.meta.url), 'utf8');
  const residence = catalogs.projects.find(project => project.id === 'zil-residences');
  assert.equal(residence.sections.length, 9, 'Zil Residences includes the complete reference gallery');
  for (const image of [residence.image, ...residence.sections.map(item => item.image)]) {
    assert.ok(detail.includes(`src="${image}"`), `missing project image: ${image}`);
  }
  assert.match(detail, /class="project-story-mobile-copy"/);
  assert.match(detail, /class="project-story-aside"/);
  assert.match(detail, /href="\/projects\/zil-resort\/"/);
  const basicProject = await readFile(new URL('../dist/projects/zil-resort/index.html', import.meta.url), 'utf8');
  assert.match(basicProject, /class="project-story-scroll"/, 'projects without extra sections use the same template');
  for (const category of ['newsletters', 'updates', 'commercial', 'resorts']) {
    const html = await readFile(new URL(`../dist/journal/${category}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`href="/journal/${category}/" aria-current="page"`), category);
    const count = (html.match(/class="article-card"/g) || []).length;
    assert.equal(count, catalogs.articles.filter(article => article.categories.includes(category)).length, category);
  }
  for (const [name, route] of Object.entries({ about: 'about', projects: 'projects', journal: 'journal', contact: 'contact', privacy: 'privacy' })) {
    const html = await readFile(new URL(`../dist/${name}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`location.replace("/${route}/" + location.search)`), name);
  }
  for (const [name, kind, route] of [['project', 'projects', 'projects'], ['article', 'articles', 'journal']]) {
    const html = await readFile(new URL(`../dist/${name}.html`, import.meta.url), 'utf8');
    const ids = JSON.parse(html.match(/const ids = (\[[^;]*\]);/)?.[1] || '[]');
    assert.deepEqual(new Set(ids), new Set(catalogs[kind].map(item => item.id)));
    assert.ok(html.includes(`if (id && ids.includes(id)) location.replace('/${route}/' + encodeURIComponent(id) + '/')`), name);
    assert.ok(html.includes('no encontrado'), name);
  }
});
