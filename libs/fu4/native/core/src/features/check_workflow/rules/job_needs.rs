use std::collections::{BTreeMap, HashMap};

use crate::entities::workflow::{Job, Workflow};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::text::quote;
use crate::shared::yaml::Pos;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Status {
    New,
    Active,
    Finished,
}

struct Node {
    id: String,
    needs: Vec<String>,
    resolved: Vec<usize>,
    status: Status,
    pos: Pos,
}

#[derive(Default)]
pub struct JobNeeds {
    report: Report,
    nodes: Vec<Node>,
    index: BTreeMap<String, usize>,
}

impl JobNeeds {
    fn detect_cyclic(&mut self, v: usize) -> Option<(usize, usize)> {
        self.nodes[v].status = Status::Active;
        for w in self.nodes[v].resolved.clone() {
            match self.nodes[w].status {
                Status::Active => return Some((v, w)),
                Status::New => {
                    if let Some(edge) = self.detect_cyclic(w) {
                        return Some(edge);
                    }
                }
                Status::Finished => {}
            }
        }
        self.nodes[v].status = Status::Finished;
        None
    }

    fn collect_cycle(&self, src: usize, edges: &mut HashMap<usize, usize>) -> bool {
        for &dest in &self.nodes[src].resolved {
            if self.nodes[dest].status != Status::Active {
                continue;
            }
            edges.insert(src, dest);
            if edges.contains_key(&dest) {
                return true;
            }
            if self.collect_cycle(dest, edges) {
                return true;
            }
            edges.remove(&src);
        }
        false
    }
}

impl Rule for JobNeeds {
    fn name(&self) -> &'static str {
        "job-needs"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_job_pre(&mut self, job: &Job) {
        let mut needs: Vec<String> = Vec::new();
        for need in &job.needs {
            let id = need.value.to_lowercase();
            if needs.contains(&id) {
                self.error(
                    need.pos,
                    format!(
                        "job ID {} duplicates in \"needs\" section. note that job ID is case insensitive",
                        quote(&need.value)
                    ),
                );
                continue;
            }
            if !id.is_empty() {
                needs.push(id);
            }
        }
        let id = job.id.value.to_lowercase();
        if id.is_empty() {
            return;
        }
        if let Some(&previous) = self.index.get(&id) {
            let message = format!(
                "job ID {} duplicates. previously defined at {}. note that job ID is case insensitive",
                quote(&job.id.value),
                self.nodes[previous].pos.describe()
            );
            self.error(job.pos, message);
        }
        self.index.insert(id.clone(), self.nodes.len());
        self.nodes.push(Node {
            id,
            needs,
            resolved: Vec::new(),
            status: Status::New,
            pos: job.id.pos,
        });
    }

    fn visit_workflow_post(&mut self, _workflow: &Workflow) {
        let mut valid = true;
        let order: Vec<usize> = self.index.values().copied().collect();
        for &node in &order {
            let mut resolved = Vec::new();
            for dep in self.nodes[node].needs.clone() {
                match self.index.get(&dep) {
                    Some(&target) => resolved.push(target),
                    None => {
                        let message = format!(
                            "job {} needs job {} which does not exist in this workflow",
                            quote(&self.nodes[node].id),
                            quote(&dep)
                        );
                        let pos = self.nodes[node].pos;
                        self.error(pos, message);
                        valid = false;
                    }
                }
            }
            self.nodes[node].resolved = resolved;
        }
        if !valid {
            return;
        }
        let mut first = None;
        for &node in &order {
            if self.nodes[node].status == Status::New
                && let Some(edge) = self.detect_cyclic(node)
            {
                first = Some(edge);
                break;
            }
        }
        let Some((from, to)) = first else {
            return;
        };
        let mut edges = HashMap::new();
        edges.insert(from, to);
        self.collect_cycle(to, &mut edges);
        let mut start = from;
        for &node in edges.keys() {
            if self.nodes[node].pos.is_before(&self.nodes[start].pos) {
                start = node;
            }
        }
        let mut message = format!(
            "cyclic dependencies in \"needs\" job configurations are detected. detected cycle is {}",
            quote(&self.nodes[start].id)
        );
        let (mut current, mut next) = (start, edges[&start]);
        loop {
            message.push_str(" -> ");
            message.push_str(&quote(&self.nodes[next].id));
            current = next;
            next = edges[&current];
            if current == start {
                break;
            }
        }
        let pos = self.nodes[start].pos;
        self.error(pos, message);
    }
}
