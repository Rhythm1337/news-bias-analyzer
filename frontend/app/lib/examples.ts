/**
 * Sample articles for users to see how the analyzer behaves at different
 * points on the bias / emotional / factual scales.
 *
 * These are synthetic texts written for demonstration, NOT excerpts from
 * real published articles. They exaggerate stylistic markers so the
 * differences in scoring are obvious.
 */

export type Example = {
  id: string;
  label: string;
  description: string;
  text: string;
};

export const EXAMPLES: Example[] = [
  {
    id: "neutral-wire",
    label: "Neutral wire-service",
    description:
      "Calm, well-sourced reporting style. Should score near center, calm, high factual.",
    text: `The Federal Reserve voted on Wednesday to hold its benchmark interest rate at the current target range of 4.25 to 4.50 percent, citing continued progress on inflation alongside concerns about labor market softening. The decision was unanimous among voting members of the Federal Open Market Committee.

In a statement accompanying the decision, the central bank said economic activity has continued to expand at a moderate pace, while job gains have slowed and the unemployment rate remains low. Core inflation, which excludes volatile food and energy prices, eased to 2.6 percent over the prior twelve months, according to data released earlier this month by the Bureau of Labor Statistics.

Fed Chair Jerome Powell, speaking at a news conference following the announcement, said the committee will continue to assess incoming data before making further adjustments. "We are in no hurry to cut rates," Powell said, adding that policymakers want greater confidence that inflation is moving sustainably toward the 2 percent target.

Market reaction was muted, with the S&P 500 closing essentially flat on the day. Treasury yields on the two-year note rose by 4 basis points. Economists at major banks were divided on the timing of the next rate change, with some forecasting a cut as early as the next meeting and others expecting the Fed to hold steady through the first half of next year.`,
  },
  {
    id: "loaded-opinion",
    label: "Charged opinion piece",
    description:
      "Highly emotional language, loaded framing. Should score charged/inflammatory with red flags.",
    text: `Once again, the political establishment has shown its utter contempt for ordinary working families. In a stunning act of betrayal, lawmakers rammed through their disastrous budget bill in the dead of night, ignoring the desperate pleas of citizens who are already crushed under the weight of their reckless decisions.

Critics (and there are many, though you would never know it from the corporate media's slavish coverage) have called the bill a giveaway to wealthy donors at the expense of everyone else. Make no mistake: this is exactly what it looks like. The same tired faces who spent decades hollowing out our communities now have the audacity to demand applause for "compromise" that delivers nothing but more pain.

Anyone with eyes can see what is really happening. While families struggle to afford groceries and watch their savings evaporate, these politicians and their lobbyist friends are laughing all the way to the bank. The system isn't broken; it is rigged, and they want to keep it that way.

It is long past time for accountability. Citizens must rise up and demand real change before it is too late. The hour is late, and the stakes have never been higher.`,
  },
  {
    id: "sensational-clickbait",
    label: "Sensational clickbait",
    description:
      "Vague claims, anonymous sources, dramatic framing. Should score high fake-news likelihood.",
    text: `SHOCKING new revelations are sending shockwaves through the scientific community as a top researcher reportedly admits what insiders have been whispering about for years. Sources say the truth is finally coming out, and it could change EVERYTHING you thought you knew about your morning coffee.

According to a person familiar with the matter, who asked not to be named due to the sensitive nature of the findings, the entire foundation of decades of nutrition science may have been built on shaky ground. "People are going to be furious when they find out," the source claimed.

Experts (though none would speak on the record) have warned that the implications are staggering. One scientist, who could not be reached for comment by press time, is said to be preparing a bombshell report that will allegedly expose what really happens when you drink coffee every day. Number 7 will SHOCK you.

The story is developing rapidly and major outlets have so far refused to cover it, raising questions about why this information is being suppressed. Stay tuned as we bring you the latest from sources close to the investigation. You won't believe what they don't want you to know.`,
  },
];
