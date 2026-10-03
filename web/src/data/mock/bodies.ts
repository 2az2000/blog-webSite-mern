import type { ArticleDetail, LongformDetail } from "@/types/content";

/*
 * Article bodies — verbatim from blog-refrence/article.html and longform.html.
 * The reference renders the same body for every article slug (only the
 * headline, byline and hero bind to the record); the mock service does the same.
 */

export const defaultArticleDetail: ArticleDetail = {
  label: "Reported feature",
  heroAlt: "A long exposure of a server hall corridor, racks receding into low blue light.",
  heroCaption:
    "Overnight maintenance at a colocation facility outside Dublin, where three of the systems described in this story are hosted.",
  heroCredit: "Photograph for NOVA",
  updated: "2026-09-13",
  dropcap: true,
  body: [
    { type: "p", text: "The first spreadsheet did exactly what it was told and nothing else. That was the promise: a machine that would not surprise you. Four decades of software design inherited the assumption without ever quite examining it, and the result is an industry that treats a program's ignorance of its own situation as a feature rather than a limitation." },
    { type: "p", text: "That assumption is now being dismantled, quietly, in products most people already use. The shift is not the one the marketing describes. It is not that software has become clever. It is that software has begun to carry a memory of the circumstances it is operating in — who is asking, what they were doing an hour ago, which of the fourteen open documents is the one that matters — and to act on that memory without being asked." },
    { type: "h2", text: "The cost of starting from zero" },
    { type: "p", text: "Ask the people who maintain large internal tools what they spend their time on and the answer is rarely the feature list. It is re-explaining. Every session begins from nothing: the tool does not know which project you are on, which conventions your team uses, or that the thing it is about to suggest was rejected last Tuesday for reasons recorded three tabs away." },
    { type: "p", text: "“We measured it once, half as a joke,” said a platform engineer at a logistics company who asked not to be named because the study was never published. “Forty per cent of the interactions in our internal tooling were the user telling the system something the system already had access to. It just had not been wired to look.”" },
    { type: "p", text: "That number is not generalisable and she would be the first to say so. But the shape of it recurs everywhere. The expensive part of most software is not computation. It is the repeated human labour of supplying context that the system could, in principle, have held onto." },
    {
      type: "figure",
      src: "/images/ai-labour.jpg",
      width: 1600,
      height: 1067,
      ratio: "3x2",
      wide: true,
      alt: "A worker at a standing desk reviewing two monitors of scheduling software in a warehouse office.",
      caption: "A scheduling floor in Rotterdam, where context-aware tooling was piloted for eleven months before a wider rollout.",
      credit: "Photograph for NOVA",
    },
    {
      type: "pullquote",
      text: "The expensive part of most software is not computation. It is the repeated human labour of supplying context the system could have held onto.",
      cite: "Elena Duarte, reporting",
    },
    { type: "h2", text: "What changes when the system remembers" },
    { type: "p", text: "The engineering answer is unglamorous: retrieval, state, and a great deal of plumbing. The design answer is more interesting, because holding context changes what an interface is **for**. A tool that knows nothing must be commanded. A tool that knows something can propose — and proposal is a fundamentally different interaction, with a different failure mode." },
    { type: "p", text: "Command fails loudly. You asked for the wrong thing and you can see that you did. Proposal fails quietly. The system offers something plausible, you accept it because accepting is cheaper than checking, and the error propagates. Designers who have worked on these systems describe an unfamiliar obligation: making the machine's reasoning legible enough to argue with." },
    {
      type: "list",
      items: [
        "**Show the working.** Every proposal carries the two or three pieces of context that produced it, inline, not behind a disclosure.",
        "**Make refusal cheap.** Dismissing a suggestion should take one gesture and should teach the system something.",
        "**Keep the command path.** The moment a proposal is wrong, the user needs the old, dumb, explicit controls — intact and in the same place.",
      ],
    },
    { type: "recirc", label: "Related reporting" },
    { type: "h2", text: "The institutional problem" },
    { type: "p", text: "Context is a privacy question wearing an engineering costume. A system that remembers what you were doing is, by construction, a system that holds a record of what you were doing — and the teams shipping these features are largely making retention decisions on their own, inside product reviews, without anything resembling institutional oversight." },
    { type: "blockquote", text: "“The question we kept failing to answer was not whether we could keep the context. It was who gets to delete it, and how fast, and whether a user can tell that it happened.”" },
    { type: "p", text: "Three of the four companies that spoke to NOVA for this story have written retention limits into their context layers. None of them surface those limits in the interface. Asked why, two gave versions of the same answer: nobody has worked out how to explain it without alarming people, and the incentive to try is weak." },
    { type: "h3", text: "What to watch next" },
    { type: "p", text: "The interesting signal over the next eighteen months will not be capability announcements. It will be whether context becomes portable — whether the record a system builds about how you work can be exported, inspected and moved, the way a document can. If it can, this is a genuine shift in what software is. If it cannot, it is a very sophisticated form of lock-in with a better story attached." },
    { type: "p", text: "Either way, the assumption that shipped with the first spreadsheet is gone. Software has started to carry circumstance. The design profession has perhaps two years to work out what honest circumstance-carrying looks like before the conventions harden and we all live inside whatever we happened to ship." },
  ],
};

export const longformDetails: Record<string, LongformDetail> = {
  "grid-rebuild": {
    eyebrow: "NOVA Long Read · Society",
    heroAlt: "Transmission pylons silhouetted against a dusk sky, a service road running beneath them.",
    bylineRole: "Investigations",
    reporterBio:
      "Sofia reports on infrastructure and the institutions that fund it. This piece draws on eleven night shifts across four jurisdictions and documents obtained through access requests, published alongside the story.",
    filedUnder: [
      { label: "Infrastructure", topic: "climate" },
      { label: "Energy", topic: "climate" },
      { label: "Labour", topic: "work" },
    ],
    relatedSection: "society",
    related: ["city-night", "battery-chemistry", "public-transit"],
    body: [
      { type: "chapter", id: "ch1", label: "Chapter one", title: "The night shift" },
      { type: "p", text: "The work starts at 22:40, which is when the load on this section of line drops far enough that it can be taken out of service without anyone noticing. By 23:15 the crew has the conductor down, and by 04:50 it is back up, carrying a cable rated for roughly twice what it replaced. In the morning, nothing has visibly changed. That is the point." },
      { type: "p", text: "Multiply that by eleven thousand spans and you have the shape of the project: a rebuild conducted entirely inside the gaps where the system can spare a few hours. No ribbon cuttings, no ground-breaking photographs, and — because nothing is ever switched off in a way the public experiences — almost no coverage." },
      {
        type: "break",
        src: "/images/grid-rebuild-2.jpg",
        width: 1600,
        height: 1067,
        alt: "A line crew working from an insulated platform at night, lit by work lamps.",
        caption: "A reconductoring crew working a six-hour outage window. Most of the rebuild happens between 23:00 and 05:00.",
        credit: "Photograph for NOVA",
      },
      { type: "chapter", id: "ch2", label: "Chapter two", title: "What 1962 left behind" },
      { type: "p", text: "The lines being replaced were strung when demand grew in a straight line and generation sat where the coal was. Both assumptions are now false. Supply has moved to where the wind is, demand has become spiky and bidirectional, and the network in between was designed for a problem that no longer exists." },
      {
        type: "pullquote",
        text: "We are not upgrading a grid. We are replacing the physical argument the grid was built to win.",
        cite: "Regional transmission planner, speaking on background",
      },
      { type: "p", text: "Reconductoring — threading a higher-capacity cable through towers that already exist — turns out to be the cheapest way through, because the expensive part of transmission was never the wire. It was the right of way, the consent, and the thirty years of negotiation underneath both." },
      { type: "chapter", id: "ch3", label: "Chapter three", title: "The queue" },
      { type: "p", text: "Ask anyone in the industry what the bottleneck is and they will say the interconnection queue before you finish the question. Projects wait years for a study that determines what network reinforcement they must fund. The study depends on which other projects in the queue proceed. Many do not. The study is redone." },
      { type: "p", text: "Four jurisdictions have now moved to cluster studies, processing applications in batches rather than in order of arrival. The early numbers are encouraging and everyone quoting them adds the same caveat: the backlog was a decade in the making and two years of reform has not cleared it." },
      {
        type: "chart",
        description:
          "Median interconnection wait in years by cohort: 2016 cohort 1.9 years, 2018 cohort 2.8, 2020 cohort 3.9, 2022 cohort 5.4, 2024 cohort 4.6.",
        max: 5.4,
        unit: "years",
        rows: [
          { label: "2016", value: 1.9, muted: true },
          { label: "2018", value: 2.8, muted: true },
          { label: "2020", value: 3.9 },
          { label: "2022", value: 5.4 },
          { label: "2024", value: 4.6 },
        ],
      },
      { type: "chartNote", text: "Median time from queue entry to signed agreement, by year of application. Illustrative figures composed for this prototype; NOVA would publish the underlying dataset alongside the story." },
      { type: "chapter", id: "ch4", label: "Chapter four", title: "Counting the copper" },
      { type: "p", text: "Every kilometre of replaced conductor produces a kilometre of recovered aluminium and steel, and the recovery contracts have quietly become one of the more competitive corners of the metals market. Two crews described being asked to log reclaimed weight more carefully than installed weight — an accounting emphasis that says something about where the margin sits." },
      {
        type: "note",
        label: "Reporter’s note",
        text: "Reclaimed-metal tonnage is not published by any of the four operators. The figures in this chapter come from two crews’ own shift logs, shared on condition that neither depot is named, and they should be read as indicative of practice rather than as a programme total.",
      },
      { type: "recirc", label: "Read next", slugs: ["battery-chemistry", "city-night"] },
      { type: "chapter", id: "ch5", label: "Chapter five", title: "Who pays for patience" },
      { type: "p", text: "Transmission is recovered through tariffs over decades, which means the bill for tonight's outage window lands on people who are, in some cases, not yet born. That is the standard defence of the model and it is not a bad one. The complication is that the benefit is also distributed unevenly, and the places carrying the most new steel are rarely the places consuming the most new electricity." },
      { type: "blockquote", text: "“The county gets the pylons and the substation and the traffic. The load centre three hundred kilometres away gets the electricity. You can argue that is fine. You cannot argue it is obvious.”" },
      {
        type: "break",
        src: "/images/grid-rebuild-3.jpg",
        width: 1600,
        height: 1067,
        alt: "A substation yard at dawn, transformers and steel gantries under a pale sky.",
        caption: "A substation rebuilt in stages over four years while remaining in service throughout.",
        credit: "Photograph for NOVA",
      },
      { type: "chapter", id: "ch6", label: "Chapter six", title: "A decade in sequence" },
      {
        type: "timeline",
        items: [
          { year: "2019", title: "First reconductoring pilot", text: "Sixty kilometres rebuilt under live conditions to test whether night windows could carry the schedule. They could, barely." },
          { year: "2021", title: "Programme committed", text: "The pilot becomes a decade-long capital plan. Crew recruitment, not cable supply, is identified as the binding constraint." },
          { year: "2022", title: "The queue peaks", text: "Median wait for an interconnection agreement reaches 5.4 years. Three jurisdictions announce cluster-study reform." },
          { year: "2024", title: "First reform cohort clears", text: "Median wait falls to 4.6 years. Planners caution that the improvement is concentrated in two regions." },
          { year: "2026", title: "Halfway, on paper", text: "Roughly 47 per cent of planned spans rebuilt. The remaining half includes the difficult crossings deliberately scheduled last." },
        ],
      },
      { type: "chapter", id: "ch7", label: "Chapter seven", title: "What finishing looks like" },
      { type: "p", text: "There will be no completion ceremony, because there is no completion. The plan's final year simply hands over to a maintenance cycle, and the crews working tonight will still be working, on spans they rebuilt at the start, which will by then be old enough to need looking at again." },
      { type: "p", text: "“People ask when it will be done,” one supervisor said, packing up at 05:10 with the line back in service and the sky going grey behind him. “It is a grid. It is never done. The question is whether it is ahead of what we are asking it to carry. Right now it is not. In eight years, maybe.”" },
    ],
  },
};
