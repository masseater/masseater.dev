---
title: "People summarize as they read"
description: "People read a document by summarizing it into their own interpretation as they go and moving on. The wording disappears and only the gist remains, so documents need to be divided into units that are easy to summarize. Drawing on research on reading comprehension and memory, this post sorts out this premise and what it implies for how to write."
tags: ["認知", "文章", "AI"]
published: true
stage: idea
---

I have AI write many of the posts on this blog and many of my documents. What troubles me then is that AI and people read text in completely different ways.

AI can read a document while holding all of it. People are different. People summarize into their own interpretation each time as they read, and move on holding only the summary. I call this way of reading, which repeats small compressions, micro-compaction. How documents are written does not work unless it assumes this difference.

## How summarizing while reading works

Summarizing while reading has been modeled in reading research as macrorules. van Dijk and Kintsch proposed that readers build the gist of a text by repeatedly applying deletion, generalization and construction to a sequence of propositions[^kintsch-vandijk-1978]. Readers do not hold the whole text. They hold the folded gist and let go of details one after another.

If the gist is not provided in the text, readers make one themselves. Brown and Day added, among the rules for making summaries, invention when there is no topic sentence[^brown-day-1983]. If there is no gist at the start of a paragraph, readers invent a topic, and that topic can drift from what the writer intended. Putting the gist first in each paragraph pulls the reader's invention toward the writer's intent.

## Only the gist remains

The wording begins to disappear right after understanding is complete. In Sachs's experiment, readers mistook sentences with the same meaning but different wording for the original sentence. The more text was inserted in between, the more these mistakes increased[^sachs-1967]. Fuzzy-trace theory, which holds that verbatim traces decay faster than gist traces, points in the same direction[^fuzzy-trace].

So in documents where details such as definitions and numbers are needed for later judgments, a design that relies on the reader's memory does not work. Place the details again near where they are used. Conversely, for parts that only need to get across correctly once, resources should go into making sure the gist is folded correctly.

## Where to put the framework

Context does not work unless it is given before reading. In Bransford and Johnson's experiment, even with an ambiguous procedural text, the group that saw a picture showing the content before reading nearly doubled in comprehension and recall. The group that saw it after reading was no different from the group that did not see it at all[^bransford-johnson-1972].

This is why the purpose and the subject go at the start. Readers use the framework to build their understanding as they read. A structure that gives the context for the first time in a summary at the end does not help understanding while reading.

## Divisions and headings

The size of divisions cannot be decided by a number. Miller's 7±2 is an approximate figure about absolute judgment and immediate memory, and Miller himself positioned it as a rhetorical estimate[^miller-1956]. In Cowan's reassessment, the central capacity is put at about 4±1 chunks[^cowan-2001]. But this number is not a constant that decides how many parts a document should be divided into either. This is because the size of a chunk changes with the reader's knowledge. What works is not a number but cutting into units that hold together as one piece given the reader's knowledge.

Headings become the reader's summary itself. In texts with headings, memory of the topics improves, and they are more likely to remain in summaries[^lorch-1996][^lorch-2001]. Conversely, headings that do not match the content distort the reader's understanding[^kozminsky-1977]. If only some sections get headings, topics without headings tend to drop out of the reader's summary. Headings become a map only when the range and granularity they cover are made consistent.

## The premise of shallow reading

Readers do not process all of a text evenly. Even skilled readers skip about 30% of words without fixating on them[^rayner-1998]. Understanding can stop at a depth that is enough for the task[^ferreira-patson-2007].

If important constraints such as exceptions and prohibitions are buried in the flow of the text, they get swept away by this shallow processing. Cut constraints out of the flow and put them in bullet points or separate paragraphs. Avoiding sentence patterns that easily pull readers into plausible misunderstandings, such as the passive voice and double negatives, is for the same reason.

## Documents you can go back and look up

A document is not something to memorize but something to go back to and look up. People routinely make up for the limits of what they can hold internally by writing things down externally[^risko-gilbert-2016].

If readers are going to summarize and move on anyway, the writer's job comes down to two things. Providing units in which that summary is made correctly, and keeping a form in which readers can go back and look up the details. The more text is written by AI, the more this premise is needed. AI can write while holding everything, so unless it is given the premise, it has no reason to divide text into units people can read.

[^kintsch-vandijk-1978]: Kintsch & van Dijk (1978) Toward a model of text comprehension and production. _Psychological Review_, 85(5), 363–394.

[^brown-day-1983]: Brown & Day (1983) Macrorules for summarizing texts: The development of expertise. _Journal of Verbal Learning and Verbal Behavior_, 22(1), 1–14.

[^sachs-1967]: Sachs (1967) Recognition memory for syntactic and semantic aspects of connected discourse. _Perception & Psychophysics_, 2(9), 437–442. [DOI: 10.3758/BF03208784](https://doi.org/10.3758/BF03208784)

[^fuzzy-trace]: Reyna & Brainerd (1995) Fuzzy-trace theory: An interim synthesis. _Learning and Individual Differences_, 7(1), 1–75. For a systematic review, see [PMC8677658](https://pmc.ncbi.nlm.nih.gov/articles/PMC8677658/).

[^bransford-johnson-1972]: Bransford & Johnson (1972) Contextual prerequisites for understanding: Some investigations of comprehension and recall. _Journal of Verbal Learning and Verbal Behavior_, 11(6), 717–726.

[^miller-1956]: Miller (1956) The magical number seven, plus or minus two: Some limits on our capacity for processing information. _Psychological Review_, 63(2), 81–97.

[^cowan-2001]: Cowan (2001) The magical number 4 in short-term memory: A reconsideration of mental storage capacity. _Behavioral and Brain Sciences_, 24(1), 87–114. [PubMed](https://pubmed.ncbi.nlm.nih.gov/11515286/)

[^lorch-1996]: Lorch & Lorch (1996) Effects of headings on text recall and summarization. _Contemporary Educational Psychology_, 21(3), 261–278.

[^lorch-2001]: Lorch et al. (2001) Effects of headings on text summarization. _Contemporary Educational Psychology_, 26(2), 171–191.

[^kozminsky-1977]: Kozminsky (1977) Altering comprehension: The effect of biasing titles on text comprehension. _Memory & Cognition_, 5(4), 482–490.

[^rayner-1998]: Rayner (1998) Eye movements in reading and information processing: 20 years of research. _Psychological Bulletin_, 124(3), 372–422.

[^ferreira-patson-2007]: Ferreira & Patson (2007) The 'good enough' approach to language comprehension. _Language and Linguistics Compass_, 1(1–2), 71–83.

[^risko-gilbert-2016]: Risko & Gilbert (2016) Cognitive offloading. _Trends in Cognitive Sciences_, 20(9), 676–688. [PubMed](https://pubmed.ncbi.nlm.nih.gov/27542527/)
