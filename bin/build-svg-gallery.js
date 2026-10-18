#!/usr/bin/env node
/**
 * build-svg-gallery.js — regenerates features/graphics/svg-library/gallery.html
 * from features/graphics/svg-library/svg/*.svg.
 *
 * The svg/*.svg files are the CANONICAL copies; gallery.html is a generated
 * preview. Run this after editing or adding any svg/*.svg file:
 *
 *     node bin/build-svg-gallery.js
 *
 * Validation (fails the build):
 *   - well-formed tags (balanced <g>), has viewBox, role="img", aria-label, <title>
 *   - no id= attributes (id collisions when several SVGs are pasted into one page)
 *   - no <defs>/<marker>/<filter>/<mask>/<pattern> (same collision reason)
 *   - no <script>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SVG_DIR = path.join(ROOT, 'features', 'graphics', 'svg-library', 'svg');
const OUT = path.join(ROOT, 'features', 'graphics', 'svg-library', 'gallery.html');

// One-line descriptor + "when to use" per component (kept here, mirrored in README.md)
const META = {
  'flow-pipeline': { desc: 'Horizontal multi-step process with connectors and a feedback loop', use: 'Stages of a process, delivery pipeline, analysis workflow' },
  'cycle-loop': { desc: 'Four-node circular loop with clockwise arrows back to the start', use: 'Iterative processes: plan-build-measure-learn, audit cycles, feedback loops' },
  'hub-spoke': { desc: 'Central topic connected to six satellite topics', use: 'Concept maps, ecosystems, capability overviews, research landscape' },
  'pyramid-hierarchy': { desc: 'Four-level pyramid (narrow apex to broad base) with side annotations', use: 'Strategy→task hierarchies, organisational levels, abstraction layers' },
  'venn-overlap': { desc: 'Two-way overlap with a distinct shared zone', use: 'Relationships between two disciplines, shared vs unique capabilities' },
  'quadrant-matrix': { desc: '2×2 matrix with dashed axes and four tinted quadrant cells', use: 'Prioritisation matrices (impact vs effort), risk maps, positioning' },
  'funnel-stages': { desc: 'Four-stage narrowing funnel with conversion percentages', use: 'Sales/user funnels, pipeline stages, cohort retention' },
  'roadmap-timeline': { desc: 'Horizontal spine with five milestones and alternating callout cards', use: 'Project roadmaps, phased timelines, milestone plans' },
  'fishbone-causal': { desc: 'Ishikawa skeleton: four cause categories feeding one outcome box', use: 'Root-cause analysis, drivers-of-an-outcome summaries' },
  'layer-stack': { desc: 'Four-layer vertical stack with per-layer captions', use: 'Architecture stacks, solution layers, dependency tiers' },
  'target-bullseye': { desc: 'Concentric priority rings around one goal, dart in the bullseye, labelled leaders', use: 'Goal setting, must/should/could priorities, scope focus' },
  'staircase-steps': { desc: 'Five rising steps on a shared baseline with a goal flag on top', use: 'Maturity models, capability ladders, growth stages' },
  'chevron-progression': { desc: 'Five interlocking chevron phases with durations and activities', use: 'Project phases, methodology stages, programme timelines' },
  'iceberg-depth': { desc: 'Visible tip vs larger hidden mass below a waterline, with labelled leaders', use: 'Visible symptoms vs underlying causes, hidden costs, culture models' },
  'balance-scale': { desc: 'Two-pan balance tilted toward the heavier side, factors listed under each pan', use: 'Trade-offs, pros vs cons, cost vs benefit, decision verdicts' },
  'radar-spider': { desc: 'Six-axis radar: current profile vs dashed target, with legend and takeaway', use: 'Capability assessments, maturity scoring, option profiles' },
  'journey-map': { desc: 'Five stages with touchpoints and an emotion curve through face markers', use: 'Customer/user journeys, onboarding experience, service blueprints' },
  'converging-forces': { desc: 'Four corner drivers with fat arrows converging on one central subject', use: 'External pressures, drivers of change, stakeholder influence' },
  'puzzle-pieces': { desc: '2×2 interlocking jigsaw with the final piece lifted out', use: 'Parts of a whole, integrated solutions, the missing element' },
  'gear-mechanism': { desc: 'Three meshing gears with rotation cues (driver → driven)', use: 'Interdependent parts, operating models, what drives what' },
  'timeline-vertical': { desc: 'Central spine with five dated events alternating left and right', use: 'Company histories, project chronologies, release history' },
  'swimlane-gantt': { desc: 'Four workstream lanes with bars across six quarters, a today marker and a milestone', use: 'Roadmaps by team, Gantt-lite plans, parallel workstreams' },
  'honeycomb-cluster': { desc: 'Seven packed hexagons with one solid focus cell', use: 'Capability maps, building blocks, product modules' },
  'dual-hub': { desc: 'Two hubs with three satellites each, bridged by a shared goal', use: 'Comparing two options or teams that share an objective' },
  'petal-cycle': { desc: 'Six leaf-shaped petals around a hub with clockwise flow cues', use: 'Six-stage cycles, continuous-improvement loops, lifecycles' },
  'decision-tree': { desc: 'Root question splitting yes/no through two follow-ups into four outcome cards', use: 'Decision guides, triage rules, build-vs-buy logic' },
  'snake-path': { desc: 'Winding road with seven numbered stations, a U-turn and a goal flag', use: 'Long processes (6–9 steps), learning paths, programme journeys' },
  'onion-layers': { desc: 'Four nested half-rings from outer context to inner core, with leader descriptions', use: 'Spheres of influence, nested scopes, system boundaries' },
  'pillars-foundation': { desc: 'Roof carried by four pillars standing on a foundation slab', use: 'Strategy houses, guiding principles, pillars of a programme' },
  'versus-columns': { desc: 'Two option cards with a VS badge, strengths, trade-offs and a best-for verdict', use: 'A vs B comparisons, option appraisals, before/after choices' },
  'lightbulb-layers': { desc: 'Lightbulb sliced into four numbered bands, each leading to a description card', use: 'Idea maturation, innovation stages, layers of an insight' },
  'matrix-nine-box': { desc: '3×3 matrix on two graded axes, cells warming from coral to green', use: 'Talent nine-box, portfolio grids, likelihood × impact risk' },
  's-curve-adoption': { desc: 'Logistic S-curve over four phase bands with a rate bell and a we-are-here marker', use: 'Technology adoption, product life-cycle, maturity curves' },
  'growth-tree': { desc: 'Canopy of outcomes fed by labelled roots below a soil line', use: 'Roots-and-fruits, inputs vs outcomes, theory of change' },
  'spiral-growth': { desc: 'Outward spiral through five numbered stations keyed to a legend', use: 'Compounding growth, iterative deepening, learning spirals' },
  'domino-chain': { desc: 'Five growing dominoes, the first tipping, with a chain-reaction arc', use: 'Cause chains, knock-on effects, small trigger → big outcome' },
  'network-mesh': { desc: 'Central node with strong ties and influence-sized outer nodes linked by weak ties', use: 'Stakeholder maps, ecosystems, collaboration networks' },
  'merge-paths': { desc: 'Three input streams curving into one arrow that ends at a single outcome', use: 'Data integration, synthesis, merging workstreams' },
  'five-w-agenda': { desc: 'Who / What / When / Where / Why tiles with answer cards and tags', use: 'Project briefs, kick-off agendas, incident summaries' },
  'metro-map': { desc: 'Transit-map pipeline: bundled coloured routes through numbered sections, a tool detour, a route split + re-merge, a dotted optional spur and file-icon outputs', use: 'Bioinformatics/data pipelines with alternative tools or routes (nf-core-style metro maps)' },
  'hanging-tags': { desc: 'Five round step tags hanging on strings from a rail at alternating heights', use: 'Five-step processes, playful step lists, feature tags' },
  'helix-ribbon-timeline': { desc: 'Vertical twisted ribbon with five dated events at its turning edges, alternating left/right', use: 'Company histories, growth stories, milestone timelines' },
  'ring-chain': { desc: 'Five thick numbered rings in a zig-zag chain joined by links', use: 'Linked skills/capabilities, dependent steps, value chains' },
  'semicircle-segments': { desc: 'Half donut split into three proportional shares with % callouts, a hub total and a legend', use: 'Survey splits, share-of-whole summaries (concept-level; real data → chartz)' },
  'wavy-timeline': { desc: 'Hand-drawn wavy path with five pins on crests/troughs ending in a paper plane', use: 'Project phases, light-touch roadmaps, onboarding journeys' },
  'pictogram-grid': { desc: '10×10 grid of person icons with N highlighted, headline and legend', use: '"N in 100" statistics, adoption/prevalence callouts' },
  'mind-map': { desc: 'Central idea with four curved branches to topic pills, each fanning into three sub-topics', use: 'Brainstorms, topic overviews, planning maps' },
  'eight-step-ring': { desc: 'Eight arrow-shaped ring segments running clockwise with outside labels and a hub title', use: '8-step processes, DMAIC-style cycles, continuous improvement' },
  'radial-bars': { desc: 'Four concentric 270° progress arcs with labels in the open quadrant and a takeaway card', use: 'Funnel/progress percentages, goal attainment (concept-level; real data → chartz)' },
  'org-chart': { desc: 'Three-level org chart: one lead, three heads, two reports each, elbow connectors', use: 'Org structures, team ownership, reporting lines' },
  'world-dot-map': { desc: 'Dot-matrix world (continent-tinted, from Natural Earth 1:110m) with four teardrop pins and callout cards', use: 'Global footprint, office/site locations, regional hubs (precise geography → chartz GeoMap)' },
  'europe-tile-grid': { desc: 'Tile-grid map of Europe: one equal square per country (ISO alpha-2) filled by category, legend + takeaway', use: 'Country-level status/coverage across Europe where small states must stay visible' },
  'warming-stripes': { desc: 'Warming-stripes band (one stripe per year, blue cooler to red warmer) with decade axis and key', use: 'Long-run temperature change at a glance (illustrative values; swap in HadCRUT/Berkeley Earth)' },
  'climate-zones-globe': { desc: 'Flattened globe split into polar, temperate, dry and tropical bands, mirrored about the equator, with a key', use: 'Climate zones, latitude-driven patterns, biome overviews (schematic)' },
  'sector-landscape': { desc: 'Landscape of four silhouette scenes (power plant, factory, traffic, farm) with the share of each sector', use: 'Emissions or impacts by sector (placeholder shares)' },
  'sea-level-rise': { desc: 'Coastal cross-section: current sea, two dashed scenario levels reaching homes, rise arrow', use: 'Coastal exposure, flood risk, adaptation briefs (illustrative levels)' },
  'carbon-cycle': { desc: 'Simplified carbon cycle: atmosphere, fossil emissions, plant and ocean exchange, soil storage', use: 'Explaining sources vs sinks, net-zero logic, nature-based solutions' },
  'thermometer-gauge': { desc: 'Thermometer of warming vs pre-industrial with risk bands, today ~1.1 °C and the Paris 1.5/2 °C lines', use: 'Climate targets, carbon-budget framing (IPCC AR6, Paris Agreement)' },
  'energy-mix-icons': { desc: 'Five hand-drawn energy icons (solar, wind, hydro, bio, nuclear) over vertical share bars', use: 'Energy or capacity mix, technology shares (placeholder values)' },
  'planet-actions': { desc: 'Six numbered actions staggered along a dashed spine that drops into a half-globe', use: 'Climate actions, sustainability pledges, behaviour-change tips' },
  "dna-helix-steps": { desc: "Horizontal DNA double helix (A-T / G-C rungs colour-coded) with six numbered callouts above and below", use: "Sequencing or genomics workflows, six-step processes with a DNA theme" },
  "central-dogma": { desc: "DNA → transcription → mRNA (codons lettered) → ribosome translation → protein bead chain, plus replication", use: "Teaching gene expression, explaining what a sequence encodes" },
  "cell-to-dna-zoom": { desc: "Four zoom lenses: cell, nucleus, chromosome, DNA helix, linked by dashed zoom lines with typical scales", use: "Explaining biological scale, where DNA lives" },
  "lab-glassware-steps": { desc: "Five protocol steps drawn as lab equipment on a bench: tube rack, flask, cylinder, Petri dish, microscope", use: "Lab protocols, sample-processing workflows, methods overviews" },
  "cell-membrane": { desc: "Fluid-mosaic membrane cross-section: phospholipid bilayer with glycoprotein, channel, cholesterol, integral and peripheral proteins, glycolipid", use: "Teaching membrane structure, transport and signalling context" },
  "punnett-square": { desc: "Monohybrid cross Aa × Aa: parents, 2 × 2 Punnett square, 1:2:1 genotype and 3:1 phenotype ratios", use: "Teaching Mendelian inheritance, explaining carrier risk" },
  "mutation-types": { desc: "One coding sequence shown as original, substitution (missense), insertion and deletion (frameshift) with amino acids", use: "Teaching point mutations, explaining variant effects" },
  "gel-electrophoresis": { desc: "Agarose gel with wells, size ladder, five sample lanes and − / + electrodes; bands placed by log10(size)", use: "PCR checks, methods figures, teaching how gels separate DNA" },
  "well-plate-layout": { desc: "96-well plate map: standards and samples in duplicate, blanks, positive/negative controls, legend", use: "ELISA/qPCR plate layouts, protocol planning" },
  "scientific-method": { desc: "Six-step scientific-method cycle around a flask: observe, question, hypothesise, experiment, analyse, conclude", use: "Teaching the scientific method, research-process overviews" },
  "cladogram-ladder": { desc: "Diagonal trait-ladder cladogram: shark, frog, lizard, kangaroo, human branch off a spine; numbered ticks mark vertebrae, four limbs, amniotic egg, hair & milk glands, placenta", use: "Teaching shared derived traits, evolution lessons, classification overviews" },
  "cladogram-anatomy": { desc: "Rectangular cladogram with labelled parts: root, node, branch, clade bracket (sister taxa A + B), outgroup, branch colours keyed to unique vs shared history", use: "Teaching how to read a tree, glossary figures for phylogeny sections" },
  "cladogram-matrix": { desc: "Character matrix (5 land plants × 4 traits, filled dot = present) beside the cladogram it implies, numbered trait badges on the branches", use: "Showing how a tree is built from traits, methods figures, plant evolution" },
  "nested-clades": { desc: "Nested trait sets (jointed legs ⊃ mandibles & antennae ⊃ six legs ⊃ complete metamorphosis) beside the matching slanted cladogram with colour-matched ticks", use: "Explaining clades as nested groups, the Venn-to-tree link" },
  "circular-cladogram": { desc: "Circular (fan) cladogram of 16 vertebrates, radial labels, amphibians / mammals / reptiles-incl.-birds coloured as clades, fishes as a grade", use: "Big-picture trees of life, many-taxa overviews (real trees from data → chartz PhyloTree)" },
  "cladogram-styles": { desc: "One primate tree drawn three ways: diagonal, rectangular, and rotated at two nodes, chimp + human clade highlighted in each", use: "Teaching that branch shape and tip order carry no meaning, reading tree diagrams" },
  'food-web': { desc: 'Four-tier food web (producers, herbivores, carnivores, apex) with energy arrows thickening toward the base, plus decomposers returning nutrients', use: 'Teaching energy flow, ecosystem overviews, biodiversity briefs' },
  'trophic-pyramid': { desc: 'Four-level energy pyramid with the ten-percent rule between levels and heat losses leaving each level', use: 'Teaching trophic levels, energy transfer, why food chains are short' },
  'water-cycle': { desc: 'Landscape water cycle: evaporation, transpiration, condensation, precipitation, runoff, infiltration and groundwater flow', use: 'Teaching the hydrological cycle, water-resource and catchment briefs' },
  'nitrogen-cycle': { desc: 'Nitrogen cycle from atmospheric N2: fixation (bacteria, lightning), nitrification NH4+ to NO2- to NO3-, plant uptake, ammonification, denitrification', use: 'Teaching nutrient cycles, soil and agriculture briefs, eutrophication context' },
  'symbiosis-types': { desc: 'Mutualism, commensalism and parasitism as paired organisms with + / 0 / − badges (cleaner wrasse and grouper, remora and shark, tick and deer)', use: 'Teaching species interactions, ecology lessons' },
  'ecological-succession': { desc: 'Four-stage primary succession (bare rock, pioneers, grasses and shrubs, young forest) with soil thickening and a time arrow', use: 'Teaching succession, restoration and land-recovery stories' },
  'ocean-zones': { desc: 'Water column on a square-root depth axis: epipelagic to hadal zones, fading light strip, shelf, abyssal plain and trench', use: 'Marine-science lessons, deep-sea and sampling-depth context' },
  'plate-boundaries': { desc: 'Divergent, convergent (subduction) and transform (map view) plate boundaries with motion arrows, magma and earthquake marks', use: 'Teaching plate tectonics, hazard and geology overviews' },
  'reaction-coordinate': { desc: 'Exothermic reaction-energy profile: reactants, activation energy, transition state, products, ΔH, plus a lower catalysed path', use: 'Teaching kinetics and catalysis, enzyme and catalyst explainers' },
  'states-of-matter': { desc: 'Solid, liquid and gas particle models in beakers with melting, freezing, vaporisation, condensation, sublimation and deposition arrows', use: 'Teaching states of matter and phase changes' },
  'em-spectrum': { desc: 'Log-wavelength electromagnetic spectrum from gamma to radio, visible band expanded 400–700 nm, chirped wave, frequency and energy direction', use: 'Teaching light and radiation, remote-sensing and imaging context' },
  'crispr-editing': { desc: 'CRISPR-Cas9: guide RNA, NGG PAM, double-strand break 3 bp upstream, then NHEJ (indel knockout) vs HDR (donor template) outcomes', use: 'Explaining gene editing, methods overviews, biotech briefs' },
  'immune-response': { desc: 'Innate vs adaptive response (APC, helper T, cytotoxic T, B cell, plasma cells, memory) plus an IgG antibody with heavy and light chains', use: 'Teaching immunology, vaccine explainers' },
  'pcr-thermal-cycle': { desc: 'Thermocycler temperature profile (denature ~95 °C, anneal ~55–65 °C, extend ~72 °C) with a copies-double-each-cycle inset', use: 'PCR and qPCR methods, teaching amplification' },
  'transformer-block': { desc: 'Transformer encoder and decoder stacks: embeddings plus positional encoding, attention, feed-forward, residual Add & Norm, N× marker, linear + softmax head', use: 'Explaining LLM / transformer architecture at a schematic level' },
  'api-request-lifecycle': { desc: 'Sequence diagram of a web API call: client, DNS, gateway auth and rate limit, two services, database, numbered request/response arrows ending in 200 OK', use: 'Explaining backend request flow, API docs, onboarding' },
  'protocol-loop-steps': { desc: 'Eight-station bench protocol on two snaking rows (1 to 4 left to right, 5 to 8 right to left), dashed reuse loop from the last station back to prime and load, eyebrow + hero header', use: 'Lab/bench protocols with sequential reuse cycles; any 8-step workflow with a repeat-back loop' },
  'orbit-satellites': { desc: 'Core with three dashed orbits of labelled satellites and a distance legend', use: 'Stakeholder proximity, engagement tiers, spheres of influence' },
};

function validate(name, src) {
  const errs = [];
  // XML comments may not contain `--` (breaks ET.parse / strict XML); catch it at build time
  for (const c of (src.match(/<!--[\s\S]*?-->/g) || [])) {
    if (/--/.test(c.slice(4, -3))) errs.push('illegal `--` inside XML comment');
  }
const balanced = (tag) => (src.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length ===
                            (src.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  if (!balanced('g')) errs.push('unbalanced <g>');
  if (!balanced('text')) errs.push('unbalanced <text>');
  if (!/viewBox=/.test(src)) errs.push('missing viewBox');
  if (!/role="img"/.test(src)) errs.push('missing role="img"');
  if (!/aria-label=/.test(src)) errs.push('missing aria-label');
  if (!/<title>/.test(src)) errs.push('missing <title>');
  if (/\bid=/.test(src)) errs.push('contains id= (collision risk — use none)');
  if (/<defs|<marker|<filter|<mask|<pattern|<clipPath|<script/.test(src)) errs.push('contains defs/marker/filter/mask/pattern/clipPath/script');
  if (/\s(fill|stroke)="var\(/.test(src)) errs.push('var() in a presentation attribute (silently fails — use style=)');
  return errs;
}

// Card order and numbers follow the README catalog (| 1 | `flow-pipeline.svg` | ...)
const catalog = [...fs.readFileSync(path.join(SVG_DIR, '..', 'README.md'), 'utf8')
  .matchAll(/^\| *(\d+) *\| *`([\w-]+\.svg)`/gm)].map(m => m[2]);
const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));
if (files.length === 0) throw new Error('no svg files found');
for (const f of files) if (!catalog.includes(f)) throw new Error(`${f} has no row in the README catalog`);
files.sort((x, y) => catalog.indexOf(x) - catalog.indexOf(y));

const cards = [];
for (const f of files) {
  const name = f.replace(/\.svg$/, '');
  const meta = META[name];
  if (!meta) throw new Error(`no META entry for ${name}`);
  let src = fs.readFileSync(path.join(SVG_DIR, f), 'utf8');
  const firstComment = src.match(/<!--([\s\S]*?)-->/);
  if (firstComment) src = src.replace(firstComment[0], '').trim(); // strip usage comment for display
  const errs = validate(name, fs.readFileSync(path.join(SVG_DIR, f), 'utf8'));
  if (errs.length) throw new Error(`${name}: ${errs.join('; ')}`);
  cards.push({ name, ...meta, raw: firstComment ? src : fs.readFileSync(path.join(SVG_DIR, f), 'utf8') });
}

function card(c, i) {
return `    <figure class="card" id="c-${c.name}">
      <figcaption>
        <span class="idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="info"><strong>${c.name}</strong><em>${c.desc}</em><span class="use">when: ${c.use}</span></span>
      </figcaption>
      <div class="stage">${c.raw}</div>
      <details><summary>source (.svg)</summary><pre class="src"></pre></details>
    </figure>`;
}

const page = `<!--
  GENERATED FILE — do not hand-edit.
  Source of truth: svg/*.svg in this directory; regenerate with:
      node bin/build-svg-gallery.js
  (design-pack v0.12.0 SVG diagram library)
-->
<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>svg-library · design-pack</title>
<style>
  :root {
    --bg: #f8fafc; --surface: #ffffff; --surface2: #f1f5f9; --surface3: #e2e8f0;
    --border: #e2e8f0; --border-bright: #cbd5e1;
    --text: #0f172a; --text-muted: #64748b; --text-dim: #94a3b8;
    --accent: #0d9488;
    --navy: #1a2744; --deep-blue: #2c4a7c; --teal: #0d9488;
    --coral: #ef4444; --amber: #f59e0b; --green: #10b981;
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --font-head: 'Outfit', sans-serif;
    --font-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  }
  html[data-theme="dark"] {
    --bg: #0b0e14; --surface: #131820; --surface2: #1c2230; --surface3: #252b3d;
    --border: #232a35; --border-bright: #313a4a;
    --text: #f8fafc; --text-muted: #94a3b8; --text-dim: #64748b;
    --accent: #14b8a6;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-sans); background: var(--bg); color: var(--text); padding: 40px clamp(20px, 5vw, 72px) 80px; }
  header { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  h1 { font-family: var(--font-head); font-size: clamp(26px, 3.5vw, 38px); }
  header p { color: var(--text-muted); max-width: 62ch; }
  .toggle { margin-left: auto; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 14px; }
  .catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 24px; }
  @media (max-width: 520px) { .catalog { grid-template-columns: 1fr; } }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; scroll-margin-top: 20px; }
  figcaption { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
  .idx { font-family: var(--font-mono); color: var(--accent); font-size: 13px; padding-top: 2px; }
  .info strong { font-family: var(--font-head); font-size: 16px; display: block; }
  .info em { color: var(--text-muted); font-style: normal; font-size: 13px; display: block; margin-top: 2px; }
  .use { color: var(--text-dim); font-size: 12px; display: block; margin-top: 4px; }
  .stage { border: 1px solid var(--border); border-radius: 10px; background: var(--bg); padding: 10px; }
  .stage svg { display: block; }
  details { margin-top: 12px; }
  summary { cursor: pointer; color: var(--text-muted); font-size: 13px; user-select: none; }
  .src { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow: auto; max-height: 340px; white-space: pre; margin-top: 8px; }
  nav { margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; }
  nav a { font-size: 13px; color: var(--accent); text-decoration: none; border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px; }
  nav a:hover { border-color: var(--accent); }
</style>
</head>
<body>
  <header>
    <h1>svg-library</h1>
    <p>Hand-drawn SVG diagram templates for the design-pack templates. Every component is token-driven (adapts to each template's palette + light/dark) and id-free (safe to paste multiple). Copy-paste the inline SVG, then edit the labels. Toggle the theme to preview both palettes.</p>
    <button class="toggle" onclick="var h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark')">◐</button>
  </header>
  <nav>${cards.map(c => `<a href="#c-${c.name}">${c.name}</a>`).join('')}</nav>
  <main class="catalog">
${cards.map((c, i) => card(c, i)).join('\n')}
  </main>
<script>
  document.querySelectorAll('figure.card').forEach(function (fig) {
    var svg = fig.querySelector('.stage svg');
    if (svg) fig.querySelector('.src').textContent = svg.outerHTML;
  });
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, page);
console.log(`gallery.html written: ${cards.length} components (${files.join(', ')})`);