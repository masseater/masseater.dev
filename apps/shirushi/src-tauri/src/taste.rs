use std::path::Path;

use media_notes::failure::{Failure, Outcome};
use media_notes::protocol::Source;
use media_notes::store::{Row, Store, fresh_id, now};

use crate::protocol::{
    Choice, Forecast, Judgement, Mark, Pair, PairInput, Prediction, PredictionInput, Statement,
    StatementInput, Verdict,
};

const PAIRS: &str = "pairs";
const STATEMENTS: &str = "statements";
const PREDICTIONS: &str = "predictions";
const NO_PAIR: &str = "その二択はありません";
const NO_STATEMENT: &str = "その見立てはありません";

#[derive(Clone)]
pub struct Taste {
    pub pairs: Store,
    pub statements: Store,
    pub predictions: Store,
}

impl Taste {
    pub fn open(directory: &Path, file: &str) -> Outcome<Self> {
        Ok(Self {
            pairs: Store::open(directory, file, PAIRS)?,
            statements: Store::open(directory, file, STATEMENTS)?,
            predictions: Store::open(directory, file, PREDICTIONS)?,
        })
    }

    #[cfg(test)]
    pub fn in_memory() -> Outcome<Self> {
        Ok(Self {
            pairs: Store::in_memory(PAIRS)?,
            statements: Store::in_memory(STATEMENTS)?,
            predictions: Store::in_memory(PREDICTIONS)?,
        })
    }
}

fn kept_pair(taste: &Taste, pair: &Pair) -> Outcome<()> {
    taste.pairs.put(&Row {
        id: &pair.id,
        source: &pair.a.media.source,
        at: pair.at,
        value: pair,
    })
}

pub fn paired(taste: &Taste, input: PairInput) -> Outcome<Pair> {
    let pair = Pair {
        id: fresh_id(),
        a: input.a,
        b: input.b,
        at: now(),
        choice: None,
    };
    kept_pair(taste, &pair)?;
    Ok(pair)
}

pub fn chosen(taste: &Taste, id: &str, choice: Choice) -> Outcome<Pair> {
    let mut pair: Pair = taste.pairs.get(id)?.ok_or_else(|| Failure::new(NO_PAIR))?;
    pair.choice = Some(choice);
    kept_pair(taste, &pair)?;
    Ok(pair)
}

pub fn stated(taste: &Taste, input: StatementInput) -> Outcome<Statement> {
    let statement = Statement {
        id: fresh_id(),
        words: input.words,
        evidence: input.evidence,
        at: now(),
        judgement: None,
    };
    taste
        .statements
        .put_unsourced(&statement.id, statement.at, &statement)?;
    Ok(statement)
}

pub fn judged(taste: &Taste, id: &str, judgement: Judgement) -> Outcome<Statement> {
    let mut statement: Statement = taste
        .statements
        .get(id)?
        .ok_or_else(|| Failure::new(NO_STATEMENT))?;
    statement.judgement = Some(judgement);
    taste
        .statements
        .put_unsourced(&statement.id, statement.at, &statement)?;
    Ok(statement)
}

pub fn predicted(taste: &Taste, input: PredictionInput) -> Outcome<Prediction> {
    let prediction = Prediction {
        id: fresh_id(),
        media: input.media,
        from: input.from,
        to: input.to,
        verb: input.verb,
        at: now(),
    };
    taste.predictions.put(&Row {
        id: &prediction.id,
        source: &prediction.media.source,
        at: prediction.at,
        value: &prediction,
    })?;
    Ok(prediction)
}

fn same(one: &Source, other: &Source) -> bool {
    one.site == other.site && one.id == other.id
}

fn overlaps(prediction: &Prediction, mark: &Mark) -> bool {
    prediction.from < mark.to && mark.from < prediction.to
}

#[must_use]
pub fn verdict_of(prediction: &Prediction, marks: &[Mark]) -> Verdict {
    let later: Vec<&Mark> = marks
        .iter()
        .filter(|mark| same(&mark.song.source, &prediction.media.source) && mark.at > prediction.at)
        .collect();
    if later.is_empty() {
        return Verdict::Open;
    }
    if later
        .iter()
        .any(|mark| mark.verb == prediction.verb && overlaps(prediction, mark))
    {
        Verdict::Hit
    } else {
        Verdict::Miss
    }
}

pub fn forecasts(taste: &Taste, marks: &[Mark], source: Option<&Source>) -> Outcome<Vec<Forecast>> {
    Ok(taste
        .predictions
        .list::<Prediction>(source)?
        .into_iter()
        .map(|prediction| Forecast {
            verdict: verdict_of(&prediction, marks),
            prediction,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use media_notes::protocol::{Media, Site, Source};

    use super::{Taste, chosen, forecasts, judged, paired, predicted, stated, verdict_of};
    use crate::protocol::{
        Choice, Clip, Judgement, Mark, PairInput, PredictionInput, StatementInput, Verb, Verdict,
    };

    fn media(id: &str) -> Media {
        Media {
            source: Source {
                site: Site::Youtube,
                id: id.to_owned(),
            },
            title: "曲".to_owned(),
            artist: "作者".to_owned(),
        }
    }

    fn mark(id: &str, verb: Verb, from: f64, to: f64, at: i64) -> Mark {
        Mark {
            id: "m".to_owned(),
            song: media(id),
            from,
            to,
            verb,
            aspects: vec![],
            words: String::new(),
            at,
        }
    }

    fn clip(id: &str) -> Clip {
        Clip {
            media: media(id),
            from: 1.0,
            to: 2.0,
        }
    }

    #[test]
    fn keeps_the_choice_made_on_a_pair() {
        let taste = Taste::in_memory().expect("taste");
        let pair = paired(
            &taste,
            PairInput {
                a: clip("aaaaaaaaaaa"),
                b: clip("bbbbbbbbbbb"),
            },
        )
        .expect("paired");
        assert_eq!(pair.choice, None);
        chosen(&taste, &pair.id, Choice::B).expect("chosen");
        let pairs: Vec<crate::protocol::Pair> = taste.pairs.list(None).expect("pairs");
        assert_eq!(pairs[0].choice, Some(Choice::B));
        assert!(chosen(&taste, "missing", Choice::A).is_err());
    }

    #[test]
    fn keeps_the_judgement_on_a_statement() {
        let taste = Taste::in_memory().expect("taste");
        let statement = stated(
            &taste,
            StatementInput {
                words: "サビ前の無音が好き".to_owned(),
                evidence: vec!["https://youtu.be/aaaaaaaaaaa?t=28".to_owned()],
            },
        )
        .expect("stated");
        let judged = judged(&taste, &statement.id, Judgement::Wrong).expect("judged");
        assert_eq!(judged.judgement, Some(Judgement::Wrong));
    }

    #[test]
    fn scores_a_prediction_only_after_the_song_is_marked() {
        let taste = Taste::in_memory().expect("taste");
        let prediction = predicted(
            &taste,
            PredictionInput {
                media: media("aaaaaaaaaaa"),
                from: 30.0,
                to: 40.0,
                verb: Verb::Like,
            },
        )
        .expect("predicted");
        let later = prediction.at + 1;
        assert_eq!(verdict_of(&prediction, &[]), Verdict::Open);
        let before = [mark(
            "aaaaaaaaaaa",
            Verb::Like,
            30.0,
            40.0,
            prediction.at - 1,
        )];
        assert_eq!(verdict_of(&prediction, &before), Verdict::Open);
        let elsewhere = [mark("aaaaaaaaaaa", Verb::Like, 50.0, 60.0, later)];
        assert_eq!(verdict_of(&prediction, &elsewhere), Verdict::Miss);
        let other_verb = [mark("aaaaaaaaaaa", Verb::Dislike, 35.0, 45.0, later)];
        assert_eq!(verdict_of(&prediction, &other_verb), Verdict::Miss);
        let overlapping = [mark("aaaaaaaaaaa", Verb::Like, 35.0, 45.0, later)];
        assert_eq!(verdict_of(&prediction, &overlapping), Verdict::Hit);
        let scored = forecasts(&taste, &overlapping, None).expect("forecasts");
        assert_eq!(scored[0].verdict, Verdict::Hit);
    }
}
