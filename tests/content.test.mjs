import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
const root = new URL('../', import.meta.url);
const site = JSON.parse(await readFile(new URL('../src/content/site.json', import.meta.url), 'utf8'));
const images = JSON.parse(await readFile(new URL('../src/lib/image-manifest.json', import.meta.url), 'utf8'));
const catalogs = {};
for (const kind of ['projects']) {
  const dir = new URL(`../src/content/${kind}/`, import.meta.url);
  catalogs[kind] = await Promise.all((await readdir(dir)).filter(name => name.endsWith('.json')).map(async name => ({ id: name.slice(0, -5), ...JSON.parse(await readFile(new URL(name, dir), 'utf8')) })));
}

test('all migrated records have unique ordering and real image files', async () => {
  assert.equal(catalogs.projects.length, 25);
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

test('the home retains its about section, featured project cards, and personal approach without removed-page sections', () => {
  const types = site.home.sections.map(section => section.type);
  assert.ok(types.includes('home_hero'));
  assert.ok(types.includes('home_about'));
  assert.ok(types.includes('home_approach'));
  const approach = site.home.sections.find(section => section.type === 'home_approach');
  assert.equal(approach.label, 'Mi enfoque');
  assert.equal(approach.title, 'Diseñar desde el lugar, la luz y las personas.');
  assert.deepEqual(approach.principles.map(principle => principle.heading), ['Contexto', 'Luz', 'Materialidad']);
  assert.equal(approach.principles.length, 3);
  assert.deepEqual(site.home.sections.find(section => section.type === 'home_about'), {
    type: 'home_about', label: 'Sobre mi', image: '/assets/images/1657797867-aerial-3-copy.jpg',
    alt: 'Vista aérea de un proyecto arquitectónico frente al mar', title: 'Arquitectura, espacio y personas.',
    text: 'Soy Camila Guevara, arquitecta. Me interesa explorar cómo la luz, los materiales y el contexto transforman la manera de habitar cada espacio.',
  });
  assert.ok(types.indexOf('home_hero') < types.indexOf('home_about') && types.indexOf('home_about') < types.indexOf('home_projects'));
  assert.deepEqual(site.home.sections.find(section => section.type === 'home_projects')?.featuredProjects, ['zil-residences', 'zil-resort', 'gramophone-works']);
  assert.ok(!JSON.stringify(site.home).includes('Proyectos destacados'), 'the home keeps its project cards without the featured-projects tagline');
  assert.ok(types.every(type => !['home_services', 'home_intro', 'home_journal'].includes(type)));
});

test('mobile orders About, the projects heading, featured projects, then the approach; desktop keeps source order', async () => {
  const css = await readFile(new URL('../assets/site.css', import.meta.url), 'utf8');
  const mobile = css.slice(css.lastIndexOf('@media(max-width:768px)'));
  assert.ok(site.home.sections.findIndex(section => section.type === 'home_projects') < site.home.sections.findIndex(section => section.type === 'home_approach'), 'desktop keeps projects before the approach section');
  assert.ok(mobile.includes('.home-track{display:flex;flex-direction:column}'));
  assert.ok(mobile.includes('.home-track>.home-featured-projects{order:3}'));
  assert.ok(mobile.includes('.home-track>.approach-panel{order:4}'));
  assert.ok(mobile.includes('.home-featured-heading{order:0}'));
  assert.ok(mobile.includes('.home-featured-projects>.project-strip{order:1}'));
});

test('the approach section renders its principles in a desktop split and mobile stack', async () => {
  const [component, css, cms] = await Promise.all([
    readFile(new URL('../src/components/SiteSections.astro', import.meta.url), 'utf8'),
    readFile(new URL('../assets/site.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8'),
  ]);
  assert.ok(component.includes('class="approach-panel"'));
  assert.ok(component.includes('class="approach-principles"'));
  assert.ok(component.includes('section.principles.map'));
  assert.ok(css.includes('.approach-panel{width:clamp(1050px,97.9vw,1880px);display:flex;background:#fff}'));
  assert.ok(css.includes('.approach-panel{width:100%;display:block}'));
  assert.ok(cms.includes('name: home_approach'));
  assert.ok(cms.includes('name: principles'));
});

test('the About section keeps the editorial desktop composition and a responsive mobile layout', async () => {
  const [component, css] = await Promise.all([
    readFile(new URL('../src/components/SiteSections.astro', import.meta.url), 'utf8'),
    readFile(new URL('../assets/site.css', import.meta.url), 'utf8'),
  ]);
  assert.ok(component.includes('class="home-about" aria-labelledby="home-about-label"'));
  assert.ok(component.includes('<div class="home-about-copy"><h3 class="editorial-title">{section.title}</h3><p>{section.text}</p></div>'));
  const featuredBlock = component.slice(component.indexOf('<section class="home-featured-projects">'), component.indexOf('</section>', component.indexOf('<section class="home-featured-projects">')));
  assert.ok(featuredBlock.indexOf('<div class="project-strip">') < featuredBlock.indexOf('<div class="home-featured-heading">'), 'the projects heading and all-projects link come after the featured cards');
  assert.ok(css.includes('.home-about{display:grid;flex:none;width:clamp(420px,41.66vw,800px);height:100%;min-height:650px;grid-template-columns:1fr 1fr;grid-template-rows:auto 1fr;gap:0;padding:var(--gutter) var(--gutter)'), 'About label and image share the project-strip top inset on desktop');
  assert.ok(css.includes('.project-strip{display:flex;gap:clamp(12px,1.04vw,20px);padding:var(--gutter);'), 'the neighboring projects section uses the same inset');
  assert.ok(css.includes('.home-about>img{grid-column:2;grid-row:1;justify-self:end;align-self:start;width:clamp(145px,11vw,210px);height:clamp(190px,14.3vw,273px);'));
  assert.ok(css.includes('.home-about-copy{grid-column:1/3;grid-row:2;align-self:end;max-width:440px}'));
  assert.ok(css.includes('@media(max-width:768px){.home-about{width:100%;height:auto;min-height:0;grid-template-columns:38% 62%;grid-template-rows:minmax(280px,36svh) auto;'));
  assert.ok(css.includes('.home-about-copy{max-width:100%;align-self:start;padding-top:24px}'), 'mobile moves the about title closer to the image instead of pinning it to the bottom');
  assert.ok(css.includes('.home-scroll{position:fixed;inset:0 var(--rail) 0 0;overflow-x:auto;overflow-y:hidden;'), 'the horizontal homepage scroller remains intact');
  assert.ok(css.includes('@media(min-width:769px) and (max-width:1024px){'), 'narrow desktop refinements are scoped to the horizontal panels');
  assert.ok(css.includes('body.home-page .home-about{width:clamp(420px,52vw,540px)}'));
  assert.ok(css.includes('body.home-page .home-featured-heading{width:clamp(240px,25vw,300px);justify-content:flex-start;gap:16px}'));
  assert.ok(css.includes('@media(max-width:380px){.home-about{grid-template-columns:34% 66%'));
  assert.ok(css.includes('@media(min-width:1025px){'), 'desktop refinements are scoped away from tablet and mobile');
  assert.ok(css.includes('body.home-page .home-about>img{width:clamp(190px,16vw,240px);height:clamp(230px,20vw,280px)}'), 'the About image has more visual presence on desktop');
  assert.ok(css.includes('body.home-page .home-featured-heading{width:clamp(240px,22vw,350px);justify-content:flex-start;gap:18px}'), 'the projects title and link use a compact panel');
  assert.match(css, /@media\(max-width:768px\)\{[\s\S]*?\.home-featured-heading\{[^}]*flex-direction:row[^}]*align-items:center[^}]*gap:16px/);
});

test('the homepage hero anchors left on desktop and centers on mobile without the template intro', async () => {
  const [component, interactions, css] = await Promise.all([
    readFile(new URL('../src/components/SiteSections.astro', import.meta.url), 'utf8'),
    readFile(new URL('../assets/interaction.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/site.css', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /class="home-hero-content"[\s\S]*?class="hero-title"/, 'title and actions share the same hero content block');
  assert.doesNotMatch(component, /<p class="hero-intro">/, 'the intro paragraph is removed from the homepage hero');
  assert.match(component, /class="hero-title-line"/, 'the hero marks its intentional title lines');
  assert.match(interactions, /heroTitle\.children[\s\S]*?titleLines\.forEach\(line => line\.replaceChildren/, 'character animation preserves the title line wrappers');
  assert.match(css, /\.home-hero\{align-items:flex-start;justify-content:flex-end\}/, 'the desktop hero content sits at the bottom-left');
  assert.match(css, /\.home-hero \.hero-title\{max-width:95vw;white-space:normal;text-align:left;/, 'the desktop title is left-aligned');
  assert.ok(css.includes('.home-hero:after{inset:0;background:radial-gradient(ellipse 72% 48% at 31% 76%'), 'the image stays bright outside a soft focus halo behind the title');
  assert.match(css, /\.home-hero \.hero-title>\.hero-title-line:first-child\{font-size:clamp\(25px,3\.4vw,52px\);font-style:italic/, 'Portfolio is a quiet editorial kicker');
  assert.match(css, /\.home-hero \.hero-title>\.hero-title-line:last-child\{font-size:clamp\(72px,9\.5vw,156px\)/, 'Camila Guevara is the visual focus');
  assert.match(css, /\.home-hero-actions \.home-hero-button:first-child\{background:#fff;color:#171717/, 'Contactarme is the clear primary action');
  assert.match(css, /@media\(max-width:768px\)\{\s*\.home-hero\{align-items:flex-start;justify-content:flex-end;padding:0\}/, 'mobile hero content anchors to the lower left');
  assert.match(css, /\.home-hero \.hero-title>\.hero-title-line:last-child\{font-size:clamp\(34px,9\.2vw,44px\)/, 'the name scales to fit mobile');
  assert.match(css, /\.home-hero \.hero-title>\.hero-title-line\{display:block;white-space:nowrap\}/, 'mobile keeps the title lines intact');
  assert.doesNotMatch(css, /home-hero-button:disabled::after/, 'unavailable CV status does not run into the button label');
});

test('the header shows a restrained architectural mark and Camila wordmark', async () => {
  const [layout, css, logo] = await Promise.all([
    readFile(new URL('../src/layouts/SiteLayout.astro', import.meta.url), 'utf8'),
    readFile(new URL('../assets/site.css', import.meta.url), 'utf8'),
    readFile(new URL('../assets/logo.svg', import.meta.url), 'utf8'),
  ]);
  assert.match(layout, /class:list=\{\['logo'/, 'the header contains the brand link in the former logo position');
  assert.match(layout, /class="logo-mark" viewBox="0 0 48 48"/, 'the logo is an architectural line mark');
  assert.match(layout, /<span>\{site\.brand\}<\/span><small>ARQUITECTA<\/small>/, 'the logo uses the editable brand name');
  assert.match(css, /\.logo-mark\{[^}]*stroke:currentColor/, 'the mark adapts to light and dark hero backgrounds');
  assert.match(logo, /<title id="title">Isotipo arquitectónico<\/title>/);
  assert.match(layout, /site\.menu\.map\(item => \(\{ label: item\.label, href: destinations\[item\.id\]/, 'the visible menu follows the editable order');
  assert.match(layout, /cv: site\.cv/, 'the menu uses the uploaded CV when available');
  assert.match(layout, /menu-link--disabled[^>]*aria-disabled="true"/, 'CV stays unavailable without a file');
});

test('the fixed header follows the homepage hero, then turns white with readable controls', async () => {
  const [css, script, layout] = await Promise.all([
    readFile(new URL('../assets/site.css', import.meta.url), 'utf8'),
    readFile(new URL('../assets/interaction.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/layouts/SiteLayout.astro', import.meta.url), 'utf8'),
  ]);
  assert.match(layout, /'header-over-hero': home/, 'the first paint starts with the header blended into the home hero');
  assert.match(css, /body\.home-page::before\{[^}]*background:transparent/);
  assert.match(css, /body\.home-page:not\(\.header-over-hero\)::before\{[^}]*background:rgba\(255,255,255,\.94\)/);
  assert.match(css, /body\.home-page:not\(\.header-over-hero\):not\(\.menu-open\) \.logo,body:not\(\.home-page\):not\(\.menu-open\) \.logo\{color:#111\}/);
  assert.match(script, /const homeHeroVisible = homeDesktop\.matches \? heroRect\.right > 0 : heroRect\.bottom > headerBandHeight;/);
  assert.match(script, /classList\.toggle\('header-over-hero', homeHeroVisible\)/);
  assert.match(css, /body\.home-page:not\(\.header-over-hero\):not\(\.menu-open\) \.menu-toggle,body:not\(\.home-page\):not\(\.menu-open\) \.menu-toggle\{color:#111\}/);
});

test('desktop shows only the always-fixed vertical menu; the wordmark and header surface are hidden', async () => {
  const [script, css] = await Promise.all([
    readFile(new URL('../assets/interaction.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/site.css', import.meta.url), 'utf8'),
  ]);
  assert.match(script, /if \(homeDesktop\.matches\) \{\s*document\.body\.classList\.remove\('header-hidden'\);\s*return;/, 'desktop scroll never hides the vertical menu');
  assert.match(css, /@media\(min-width:769px\)\{\.logo\{display:none!important\}body::before\{display:none\}\}/, 'desktop hides the logo and horizontal header surface');
  assert.match(css, /\.site-rail\{position:fixed;right:0;top:0;bottom:0;/, 'the existing vertical menu remains fixed to the viewport');
  assert.match(css, /@media\(max-width:768px\)\{body\.header-hidden:not\(\.menu-open\) \.logo/);
});

test('project-detail gallery images skip the repetitive scroll scale reveal', async () => {
  const [script, template] = await Promise.all([
    readFile(new URL('../assets/interaction.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/projects/[id].astro', import.meta.url), 'utf8'),
  ]);
  assert.match(template, /data-project-story/, 'project detail pages expose a scope for their gallery');
  assert.ok(script.includes("].filter((image) => !image.closest('[data-project-story]'))"), 'all images within project details are excluded from scroll-scale reveals');
});

test('Estudio and Diario are fully removed from site content, routes, navigation, and Sveltia', async () => {
  const [layout, config] = await Promise.all([
    readFile(new URL('../src/layouts/SiteLayout.astro', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8'),
  ]);
  assert.deepEqual(new Set(site.menu.map(item => item.id)), new Set(['home', 'cv', 'projects', 'contact']));
  assert.ok(site.menu.every(item => item.label.trim()), 'all menu labels are non-empty');
  assert.equal('about' in site, false, 'the Studio page singleton is removed from site content');
  assert.ok(site.home.sections.every(section => !['home_intro', 'home_journal'].includes(section.type)), 'home no longer contains Studio or Diario sections');
  assert.doesNotMatch(layout, /\/about\/|\/journal\/|Estudio|Diario/);
  assert.doesNotMatch(config, /name: articles|name: about|home_journal|home_intro|journal|studio page/i, 'Sveltia no longer exposes the removed collection or page fields');
  for (const path of ['../src/pages/about.astro', '../src/pages/journal', '../src/components/JournalListing.astro', '../src/content/articles']) {
    await assert.rejects(access(new URL(path, import.meta.url)), `${path} should be deleted`);
  }
});

test('site identity and editable credit fields are valid', () => {
  assert.equal(site.brand, 'Camila Guevara');
  assert.ok(site.creditLabel.trim());
  assert.equal(new URL(site.creditUrl).protocol, 'https:');
});

test('CMS exposes every site singleton field in its matching section', async () => {
  const config = parseYaml(await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8'));
  const projects = config.collections.find(collection => collection.name === 'projects');
  const page = config.collections.find(collection => collection.name === 'pages').files.find(file => file.name === 'site');
  const names = fields => fields.map(field => field.name).sort();
  assert.equal(page.file, 'src/content/site.json');
  assert.deepEqual(names(page.fields), [...new Set([...Object.keys(site), 'cv'])].sort(), 'all editable site keys and optional CV have matching fields');
  const menu = page.fields.find(field => field.name === 'menu');
  assert.equal(menu.widget, 'list');
  assert.equal(menu.allow_reorder, true);
  assert.equal(menu.allow_add, false);
  assert.equal(menu.allow_remove, false);
  assert.deepEqual(names(menu.fields), ['id', 'label'], 'each menu option keeps its destination and text when reordered');
  assert.equal(menu.fields.find(field => field.name === 'id').readonly, true);
  const cv = page.fields.find(field => field.name === 'cv');
  assert.equal(cv.widget, 'file');
  assert.equal(cv.accept, 'application/pdf,.pdf');
  assert.equal(cv.media_folder, '/public/cv');
  assert.equal(cv.public_folder, '/cv');
  assert.equal(cv.required, false);
  assert.equal(cv.media_libraries.default.config.max_file_size, 10485760);
  assert.deepEqual(names(projects.fields), ['title', 'image', 'alt', 'category', 'location', 'description', 'language', 'order', 'sections'].sort(), 'project editor exposes only fields used by pages and sorting');
  for (const key of ['home', 'contact']) {
    const object = page.fields.find(field => field.name === key);
    assert.equal(object.widget, 'object');
    assert.deepEqual(names(object.fields), Object.keys(site[key]).sort(), `${key} fields match source data`);
    const blocks = object.fields.find(field => field.name === 'sections');
    assert.ok(blocks?.types && !blocks.allow_duplicate);
    for (const type of ['image', 'text', 'quote']) assert.ok(blocks.types.some(block => block.name === type), `${key}: ${type}`);
    for (const section of site[key].sections) {
      const type = blocks.types.find(block => block.name === section.type);
      assert.ok(type, `${key}: ${section.type}`);
      assert.deepEqual(names(type.fields), Object.keys(section).filter(name => name !== 'type').sort(), `${key}: ${section.type} fields match visible content`);
    }
  }
  const featured = page.fields.find(field => field.name === 'home').fields.find(field => field.name === 'sections').types
    .find(type => type.name === 'home_projects').fields.find(field => field.name === 'featuredProjects');
  assert.equal(featured.widget, 'relation');
  assert.equal(featured.collection, 'projects');
  assert.equal(featured.value_field, '{{slug}}');
  for (const id of site.home.sections.find(section => section.type === 'home_projects').featuredProjects) {
    assert.ok(catalogs.projects.some(project => project.id === id), `featured project ${id} exists`);
  }
});

test('fresh build emits catalog routes and legacy redirect contracts', async () => {
  await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url)), 'build'], {
    cwd: fileURLToPath(root), maxBuffer: 2 * 1024 * 1024,
  });
  for (const [route, values] of [
    ['index.html', [site.brand, 'Portfolio Camila Guevara', 'Contactarme', site.menu.find(item => item.id === 'cv').label, 'Sobre mi', 'Arquitectura, espacio y personas.', ...site.menu.map(item => item.label), site.creditLabel]],
    ['contact/index.html', [site.contact.sections[0].statement, site.contact.sections[0].email]],
  ]) {
    const html = await readFile(new URL(`../dist/${route}`, import.meta.url), 'utf8');
    for (const value of values) assert.ok(html.includes(value), `${route}: ${value}`);
    assert.match(html, /<noscript><nav class="nojs-nav" aria-label="Menú principal">/);
    for (const path of ['/', '/projects/', '/contact/']) {
      assert.ok(html.includes(`<a href="${path}"`), `${route}: no-script navigation ${path}`);
    }
  }
  const homepage = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.deepEqual([...homepage.matchAll(/class="menu-link-label"><span>([^<]+)<\/span>/g)].map(match => match[1]), site.menu.map(item => item.label), 'the rendered menu respects the CMS item order');
  await access(new URL(`../dist${site.home.sections.find(section => section.type === 'home_hero').image}`, import.meta.url));
  assert.doesNotMatch(homepage, /Ver mis proyectos/, 'the obsolete about-section CTA is not rendered');
  assert.doesNotMatch(homepage, /class="hero-intro"/, 'the home hero has no intro paragraph');
  assert.equal((homepage.match(/class="home-featured-projects"/g) || []).length, 1, 'the home displays the projects section');
  assert.doesNotMatch(homepage, /Proyectos destacados/, 'the heading is removed from the rendered home page');
  assert.ok(homepage.indexOf('The Gramophone Works') < homepage.indexOf('home-featured-heading'), 'the projects heading follows the last featured project in the built homepage');
  assert.ok(homepage.includes('Mi enfoque'));
  assert.ok(homepage.includes('Diseñar desde el lugar, la luz y las personas.'));
  for (const principle of ['Contexto', 'Luz', 'Materialidad']) assert.ok(homepage.includes(principle), `approach principle: ${principle}`);
  assert.doesNotMatch(homepage, /Conocer nuestro trabajo/, 'the redundant services CTA is removed with the old section');
  assert.ok(homepage.includes('Ver todos los proyectos'), 'the projects section keeps its dedicated all-projects CTA');
  for (const title of ['Zil Residences', 'Zil Resort', 'The Gramophone Works']) assert.ok(homepage.includes(title), `featured card: ${title}`);
  for (const id of ['zil-residences', 'zil-resort', 'gramophone-works']) {
    const project = catalogs.projects.find(item => item.id === id);
    assert.ok(homepage.includes(`href="/projects/${id}/"`), `homepage links to ${id}`);
    assert.ok(homepage.includes(project.title), `homepage displays ${project.title}`);
    assert.ok(homepage.includes(`src="${images[project.image].sources.at(-1).src}"`), `homepage displays the optimized cover for ${id}`);
  }
  assert.match(homepage, /class="home-hero-actions"/, 'the homepage hero shows its primary actions');
  assert.match(homepage, /href="\/contact\/"[^>]*>Contactarme<\/a>/, 'Contactarme points to the existing contact route');
  assert.match(homepage, /<button[^>]*disabled[^>]*aria-label="CV de Camila Guevara: falta cargar el archivo"[^>]*>CV<\/button>/, 'the CV action is safely disabled until a real file is supplied');
  assert.match(homepage, /id="entry-mask"/, 'the orange entry bars are present on the home page');
  const motionCss = await readFile(new URL('../assets/site.css', import.meta.url), 'utf8');
  assert.match(motionCss, /::view-transition-new\(project-page\)[\s\S]*?@keyframes project-page-in\{from\{opacity:\.7;transform:translate3d\(-3\.5%,0,0\)/, 'project pages slide in from left to right with a coordinated view transition');
  for (const item of catalogs.projects) {
    const page = await readFile(new URL(`../dist/projects/${item.id}/index.html`, import.meta.url), 'utf8');
    assert.ok(page.includes(item.title), `projects/${item.id}`);
  }
  assert.doesNotMatch(homepage, /\/privacy\/|Privacidad/, 'the removed privacy section is not in navigation');
  for (const route of ['about/index.html', 'journal/index.html', 'privacy/index.html', 'about.html', 'journal.html', 'article.html', 'privacy.html', 'journal']) {
    await assert.rejects(access(new URL(`../dist/${route}`, import.meta.url)), `${route} should not be emitted`);
  }
  for (const [category, label] of [['resorts', 'Turísticos'], ['commercial', 'Comerciales']]) {
    const html = await readFile(new URL(`../dist/projects/${category}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`href="/projects/${category}/" aria-current="page"`), category);
    assert.ok(html.includes(label), category);
    const titles = catalogs.projects.filter(project => project.category === category).map(project => project.title);
    assert.equal((html.match(/class="project-choice/g) || []).length, titles.length, category);
    for (const title of titles) assert.ok(html.includes(title), title);
    assert.match(html, /<img src="\/assets\/images\/optimized\/[^\"]+\.webp"[^>]*fetchpriority="high"/);
    assert.equal((html.match(/data-src="\/assets\/images\/optimized\//g) || []).length, titles.length - 1, category);
    assert.equal((html.match(/class="projects-mobile-list"/g) || []).length, 1, category);
    assert.equal((html.match(/loading="lazy"/g) || []).length, titles.length, category);
  }
  const listing = await readFile(new URL('../dist/projects/index.html', import.meta.url), 'utf8');
  assert.equal((listing.match(/class="project-choice/g) || []).length, catalogs.projects.length);
  assert.equal((listing.match(/data-src="\/assets\/images\/optimized\//g) || []).length, catalogs.projects.length - 1);
  assert.equal((listing.match(/loading="lazy"/g) || []).length, catalogs.projects.length);
  assert.match(listing, /href="\/projects\/" aria-current="page"/);
  const detail = await readFile(new URL('../dist/projects/zil-residences/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(detail, /id="entry-mask"/, 'the orange entry bars must not reappear on project pages');
  const residence = catalogs.projects.find(project => project.id === 'zil-residences');
  assert.equal(residence.sections.length, 9, 'Zil Residences includes the complete reference gallery');
  for (const image of [residence.image, ...residence.sections.map(item => item.image)]) {
    assert.ok(detail.includes(`src="${images[image].sources.at(-1).src}"`), `missing optimized project image: ${image}`);
  }
  assert.match(detail, /class="project-story-mobile-copy"/);
  assert.match(detail, /class="project-story-aside"/);
  assert.match(detail, /href="\/projects\/zil-resort\/"/);
  const basicProject = await readFile(new URL('../dist/projects/zil-resort/index.html', import.meta.url), 'utf8');
  assert.match(basicProject, /class="project-story-scroll"/, 'projects without extra sections use the same template');
  for (const [name, route] of Object.entries({ projects: 'projects', contact: 'contact' })) {
    const html = await readFile(new URL(`../dist/${name}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`location.replace("/${route}/" + location.search)`), name);
  }
  for (const [name, kind, route] of [['project', 'projects', 'projects']]) {
    const html = await readFile(new URL(`../dist/${name}.html`, import.meta.url), 'utf8');
    const ids = JSON.parse(html.match(/const ids = (\[[^;]*\]);/)?.[1] || '[]');
    assert.deepEqual(new Set(ids), new Set(catalogs[kind].map(item => item.id)));
    assert.ok(html.includes(`if (id && ids.includes(id)) location.replace('/${route}/' + encodeURIComponent(id) + '/')`), name);
    assert.ok(html.includes('no encontrado'), name);
  }
});
