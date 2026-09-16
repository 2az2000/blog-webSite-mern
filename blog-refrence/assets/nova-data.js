/* ==========================================================================
   NOVA — editorial content model
   The prototype's stand-in for the CMS. Every list surface (category, topic,
   search, trending, author, bookmarks) renders from these records, so the
   same story shows the same metadata everywhere.
   NOVA is a fictional publication; all stories, bylines and figures below are
   invented editorial content written for the prototype.
   ========================================================================== */

window.NOVA_AUTHORS = {
  duarte:    { slug: 'duarte',    name: 'Elena Duarte',       initials: 'ED', role: 'Senior Technology Correspondent' },
  feldt:     { slug: 'feldt',     name: 'Marcus Feldt',       initials: 'MF', role: 'Business Editor' },
  raghu:     { slug: 'raghu',     name: 'Priya Raghunathan',  initials: 'PR', role: 'Science Editor' },
  okonkwo:   { slug: 'okonkwo',   name: 'Tomás Okonkwo',      initials: 'TO', role: 'Design Critic' },
  vo:        { slug: 'vo',        name: 'Hannah Vo',          initials: 'HV', role: 'Culture Writer' },
  ashworth:  { slug: 'ashworth',  name: 'Daniel Ashworth',    initials: 'DA', role: 'Contributing Editor, Opinion' },
  lindqvist: { slug: 'lindqvist', name: 'Sofia Lindqvist',    initials: 'SL', role: 'Investigations' },
  haddad:    { slug: 'haddad',    name: 'Noor Haddad',        initials: 'NH', role: 'Innovation Reporter' }
};

window.NOVA_SECTIONS = {
  latest:     { name: 'Latest',     blurb: 'Everything NOVA has published, newest first — reporting, criticism and long-form work across every desk.' },
  technology: { name: 'Technology', blurb: 'The systems being built, the people building them, and the assumptions they carry. Reporting on software, hardware and the institutions around them.' },
  business:   { name: 'Business',   blurb: 'Capital, labour and the strange new shapes companies are taking. Written for people who build them, not only for people who fund them.' },
  science:    { name: 'Science',    blurb: 'Research as it actually happens — slow, contested, and far more interesting than the press release.' },
  design:     { name: 'Design',     blurb: 'Objects, interfaces and cities, and the decisions that made them what they are.' },
  culture:    { name: 'Culture',    blurb: 'How we make meaning now: memory, archives, taste and the platforms that mediate all three.' },
  society:    { name: 'Society',    blurb: 'Infrastructure, institutions and the public realm — the parts of life nobody markets.' },
  innovation: { name: 'Innovation', blurb: 'What is genuinely new, separated from what is merely announced.' },
  lifestyle:  { name: 'Lifestyle',  blurb: 'Work, rest and the material texture of the everyday.' },
  opinion:    { name: 'Opinion',    blurb: 'Arguments from NOVA writers and outside contributors. Signed, accountable and open to reply.' },
  interviews: { name: 'Interviews', blurb: 'Long conversations with the people doing the work, edited for clarity but not for comfort.' }
};

/* kind: article | opinion | video | longread | interview */
window.NOVA_ARTICLES = [
  {
    slug: 'context-software', kind: 'article', section: 'technology',
    title: 'Why the Next Generation of Software Will Be Built Around Context',
    standfirst: 'For forty years we built software that waits to be told what to do. The systems arriving now assume the opposite — and that changes what a product is.',
    author: 'duarte', date: '2026-09-12', mins: 14, img: 'context-software.jpg',
    tags: ['artificial-intelligence', 'software', 'product'], views: 84200, comments: 213, trend: 'up'
  },
  {
    slug: 'human-brain', kind: 'article', section: 'science',
    title: 'The Quiet Revolution Changing How We Understand the Human Brain',
    standfirst: 'A decade of unglamorous methodological work has quietly overturned the textbook picture of memory. The scientists responsible are in no hurry to say so.',
    author: 'raghu', date: '2026-09-11', mins: 18, img: 'human-brain.jpg',
    tags: ['neuroscience', 'research', 'memory'], views: 61800, comments: 94, trend: 'up'
  },
  {
    slug: 'interfaces-standing-still', kind: 'article', section: 'design',
    title: 'Designing Interfaces for a World That No Longer Stands Still',
    standfirst: 'Screens stopped being rectangles a while ago. Design practice has not caught up, and the gap is showing in products people use every day.',
    author: 'okonkwo', date: '2026-09-10', mins: 11, img: 'interfaces-standing-still.jpg',
    tags: ['design-systems', 'interface', 'craft'], views: 47300, comments: 136, trend: 'up'
  },
  {
    slug: 'small-powerful-companies', kind: 'article', section: 'business',
    title: 'The New Economics of Building Small, Powerful Companies',
    standfirst: 'Eight people, no outside capital, and a product used in ninety countries. A generation of founders is quietly rewriting what scale is for.',
    author: 'feldt', date: '2026-09-09', mins: 13, img: 'small-powerful-companies.jpg',
    tags: ['startups', 'capital', 'work'], views: 73500, comments: 178, trend: 'up'
  },
  {
    slug: 'internet-remember', kind: 'article', section: 'culture',
    title: 'How the Internet Changed the Way We Remember',
    standfirst: 'Outsourcing recall to a search box was supposed to free up the mind. What it freed up, and what it quietly took, are only now becoming legible.',
    author: 'vo', date: '2026-09-08', mins: 16, img: 'internet-remember.jpg',
    tags: ['memory', 'internet', 'culture'], views: 55100, comments: 88, trend: 'flat'
  },
  {
    slug: 'think-better', kind: 'opinion', section: 'opinion',
    title: "Technology Doesn't Need to Move Faster. It Needs to Think Better.",
    standfirst: 'Speed became the industry\'s only legible virtue. It is a poor proxy for judgement, and we are paying for the substitution.',
    author: 'ashworth', date: '2026-09-08', mins: 8, img: 'think-better.jpg',
    tags: ['ethics', 'industry', 'artificial-intelligence'], views: 92400, comments: 402, trend: 'up'
  },
  {
    slug: 'grid-rebuild', kind: 'longread', section: 'society',
    title: 'Inside the Decade-Long Effort to Rebuild the Electrical Grid',
    standfirst: 'It is the largest infrastructure project most people will never hear about: a continent-wide rewiring, conducted mostly at night, by crews who have been at it since 2019.',
    author: 'lindqvist', date: '2026-09-06', mins: 32, img: 'grid-rebuild.jpg',
    tags: ['infrastructure', 'energy', 'investigation'], views: 118900, comments: 267, trend: 'up'
  },
  {
    slug: 'quiet-office', kind: 'article', section: 'lifestyle',
    title: 'The Return of the Quiet Office',
    standfirst: 'After fifteen years of open plans and collaboration theatre, the most requested workplace feature is a door that closes.',
    author: 'vo', date: '2026-09-05', mins: 9, img: 'quiet-office.jpg',
    tags: ['work', 'architecture', 'attention'], views: 38700, comments: 71, trend: 'flat'
  },
  {
    slug: 'chip-shortage', kind: 'article', section: 'business',
    title: 'What the Chip Shortage Taught a Generation of Founders',
    standfirst: 'The supply crunch ended years ago. The habits it produced — deep inventory, second sources, slower promises — turned out to be durable.',
    author: 'feldt', date: '2026-09-04', mins: 12, img: 'chip-shortage.jpg',
    tags: ['hardware', 'supply-chain', 'startups'], views: 41200, comments: 63, trend: 'down'
  },
  {
    slug: 'type-revival', kind: 'article', section: 'design',
    title: 'The Typeface Revival That Started in a Municipal Archive',
    standfirst: 'Two designers, a box of water-damaged specimen sheets, and four years of work. The result is now set on the side of every bus in the city.',
    author: 'okonkwo', date: '2026-09-03', mins: 10, img: 'type-revival.jpg',
    tags: ['typography', 'archives', 'craft'], views: 29600, comments: 52, trend: 'up'
  },
  {
    slug: 'ocean-floor', kind: 'article', section: 'science',
    title: 'Mapping the Ocean Floor Is Rewriting the Climate Models',
    standfirst: 'A quarter of the seabed has now been surveyed at high resolution. The topography it revealed does not match what the models assumed.',
    author: 'raghu', date: '2026-09-02', mins: 15, img: 'ocean-floor.jpg',
    tags: ['climate', 'oceans', 'research'], views: 44800, comments: 77, trend: 'up'
  },
  {
    slug: 'ai-labour', kind: 'article', section: 'technology',
    title: 'Artificial Intelligence and the Slow Rewriting of Skilled Work',
    standfirst: 'The displacement everyone predicted has not arrived. Something subtler has: a steady renegotiation of which parts of a job count as the job.',
    author: 'duarte', date: '2026-09-01', mins: 17, img: 'ai-labour.jpg',
    tags: ['artificial-intelligence', 'work', 'labour'], views: 87600, comments: 311, trend: 'up'
  },
  {
    slug: 'city-night', kind: 'video', section: 'society',
    title: 'The Cities Learning to Run at Night',
    standfirst: 'Four municipalities moved essential services after dark to cut heat exposure. A field report on what changed for the people doing the work.',
    author: 'lindqvist', date: '2026-08-30', mins: 7, img: 'city-night.jpg',
    tags: ['cities', 'climate', 'labour'], views: 33400, comments: 45, trend: 'flat'
  },
  {
    slug: 'interview-rasmussen', kind: 'interview', section: 'interviews',
    title: 'Mira Rasmussen on Designing for Doubt',
    standfirst: 'The interface designer behind three widely copied products argues that certainty is the most over-designed quality in software.',
    author: 'okonkwo', date: '2026-08-29', mins: 21, img: 'interview-rasmussen.jpg',
    tags: ['interface', 'design-systems', 'interviews'], views: 36900, comments: 58, trend: 'up'
  },
  {
    slug: 'open-source-money', kind: 'article', section: 'technology',
    title: 'Who Actually Pays for Open Source',
    standfirst: 'We traced maintenance funding for forty widely deployed libraries. The answer is fewer people, and far less money, than the ecosystem assumes.',
    author: 'duarte', date: '2026-08-28', mins: 19, img: 'open-source-money.jpg',
    tags: ['open-source', 'software', 'investigation'], views: 66200, comments: 194, trend: 'up'
  },
  {
    slug: 'slow-fashion', kind: 'article', section: 'lifestyle',
    title: 'The Slow Unbundling of the Fashion Calendar',
    standfirst: 'Four seasons became fifty-two drops, and then stopped. What replaced the calendar is stranger and more local than anyone planned.',
    author: 'vo', date: '2026-08-27', mins: 11, img: 'slow-fashion.jpg',
    tags: ['fashion', 'commerce', 'culture'], views: 27800, comments: 39, trend: 'down'
  },
  {
    slug: 'attention-economy', kind: 'opinion', section: 'opinion',
    title: 'The Attention Economy Has an Accounting Problem',
    standfirst: 'We measure what we capture and ignore what we spend. No other industry would accept a ledger with only one side filled in.',
    author: 'ashworth', date: '2026-08-26', mins: 7, img: 'attention-economy.jpg',
    tags: ['attention', 'media', 'ethics'], views: 58300, comments: 226, trend: 'up'
  },
  {
    slug: 'battery-chemistry', kind: 'article', section: 'innovation',
    title: 'The Battery Chemistry That Could Outlast Lithium',
    standfirst: 'Sodium-ion was the compromise nobody wanted. Six years of unglamorous iteration later, it is winning contracts on price and on patience.',
    author: 'haddad', date: '2026-08-25', mins: 13, img: 'battery-chemistry.jpg',
    tags: ['energy', 'materials', 'manufacturing'], views: 49100, comments: 84, trend: 'up'
  },
  {
    slug: 'archive-fever', kind: 'article', section: 'culture',
    title: 'Archive Fever: Who Gets to Keep the Record',
    standfirst: 'Preservation used to be a question of shelf space. Now it is a question of who is still paying the hosting bill in thirty years.',
    author: 'vo', date: '2026-08-24', mins: 14, img: 'archive-fever.jpg',
    tags: ['archives', 'memory', 'internet'], views: 31500, comments: 67, trend: 'flat'
  },
  {
    slug: 'remote-labs', kind: 'article', section: 'science',
    title: 'The Laboratories That Never Close',
    standfirst: 'Automated benches now run experiments through the night for researchers on the other side of the world. The science is faster. The training is not.',
    author: 'raghu', date: '2026-08-22', mins: 12, img: 'remote-labs.jpg',
    tags: ['research', 'automation', 'education'], views: 25900, comments: 41, trend: 'flat'
  },
  {
    slug: 'founder-mode', kind: 'opinion', section: 'business',
    title: 'The Quiet Case Against Founder Mode',
    standfirst: 'Heroic management makes a good anecdote and a poor operating system. The companies that last delegate before they are forced to.',
    author: 'feldt', date: '2026-08-21', mins: 9, img: 'founder-mode.jpg',
    tags: ['management', 'startups', 'work'], views: 71300, comments: 289, trend: 'up'
  },
  {
    slug: 'public-transit', kind: 'article', section: 'design',
    title: 'Designing Public Transit People Actually Want to Use',
    standfirst: 'Frequency beats novelty, signage beats apps, and the most successful redesign of the decade began by removing a feature.',
    author: 'okonkwo', date: '2026-08-20', mins: 13, img: 'public-transit.jpg',
    tags: ['cities', 'transit', 'wayfinding'], views: 43700, comments: 112, trend: 'up'
  }
];

window.NOVA_TOPICS = {
  'artificial-intelligence': {
    name: 'Artificial Intelligence',
    blurb: 'NOVA\'s continuing coverage of machine learning systems in production: what they change about work, what they cost to run, and who is accountable when they fail.',
    related: ['software', 'labour', 'ethics', 'research']
  },
  'archives':     { name: 'Archives', blurb: 'Keeping the record, and who pays to keep it.', related: ['memory', 'internet', 'culture'] },
  'climate':      { name: 'Climate', blurb: 'Measurement, adaptation and infrastructure under a changing baseline.', related: ['energy', 'cities', 'oceans'] },
  'design-systems': { name: 'Design Systems', blurb: 'The shared vocabularies teams build so products stay coherent.', related: ['interface', 'craft', 'typography'] },
  'work':         { name: 'Work', blurb: 'How jobs are changing, from the inside.', related: ['labour', 'management', 'attention'] }
};
