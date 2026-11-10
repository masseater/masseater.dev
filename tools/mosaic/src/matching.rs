use std::cmp::Ordering;
use std::collections::BinaryHeap;

use anyhow::{Result, bail};

#[derive(Clone, Copy)]
pub(crate) struct Edge {
    pub(crate) column: usize,
    pub(crate) cost: f64,
}

struct Reached {
    distance: f64,
    column: usize,
}

impl PartialEq for Reached {
    fn eq(&self, other: &Self) -> bool {
        self.cmp(other) == Ordering::Equal
    }
}

impl Eq for Reached {}

impl PartialOrd for Reached {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Reached {
    fn cmp(&self, other: &Self) -> Ordering {
        other
            .distance
            .total_cmp(&self.distance)
            .then_with(|| other.column.cmp(&self.column))
    }
}

const FREE: usize = usize::MAX;

struct Search {
    row_price: Vec<f64>,
    column_price: Vec<f64>,
    row_of: Vec<usize>,
    column_of: Vec<usize>,
    distance: Vec<f64>,
    parent: Vec<usize>,
    settled: Vec<bool>,
    touched: Vec<usize>,
}

impl Search {
    fn new(rows: usize, columns: usize) -> Self {
        Self {
            row_price: vec![0.0; rows],
            column_price: vec![0.0; columns],
            row_of: vec![FREE; columns],
            column_of: vec![FREE; rows],
            distance: vec![f64::INFINITY; columns],
            parent: vec![FREE; columns],
            settled: vec![false; columns],
            touched: Vec::new(),
        }
    }

    fn relax(&mut self, heap: &mut BinaryHeap<Reached>, row: usize, base: f64, edges: &[Edge]) {
        for edge in edges {
            if self.settled[edge.column] {
                continue;
            }
            let reduced = edge.cost - self.row_price[row] - self.column_price[edge.column];
            let distance = base + reduced;
            if distance < self.distance[edge.column] {
                if self.distance[edge.column].is_infinite() {
                    self.touched.push(edge.column);
                }
                self.distance[edge.column] = distance;
                self.parent[edge.column] = row;
                heap.push(Reached {
                    distance,
                    column: edge.column,
                });
            }
        }
    }

    fn augment(&mut self, start: usize, graph: &[Vec<Edge>]) -> Result<()> {
        let mut heap = BinaryHeap::new();
        self.relax(&mut heap, start, 0.0, &graph[start]);
        let (sink, total) = loop {
            let Some(Reached { distance, column }) = heap.pop() else {
                bail!("行 {start} に割り当てられる列が残っていない");
            };
            if self.settled[column] || distance > self.distance[column] {
                continue;
            }
            self.settled[column] = true;
            let row = self.row_of[column];
            if row == FREE {
                break (column, distance);
            }
            self.relax(&mut heap, row, distance, &graph[row]);
        };
        for &column in &self.touched {
            if self.settled[column] && column != sink {
                let slack = total - self.distance[column];
                self.row_price[self.row_of[column]] += slack;
                self.column_price[column] -= slack;
            }
        }
        self.row_price[start] += total;
        let mut column = sink;
        loop {
            let row = self.parent[column];
            let previous = self.column_of[row];
            self.row_of[column] = row;
            self.column_of[row] = column;
            if row == start {
                break;
            }
            column = previous;
        }
        for &column in &self.touched {
            self.distance[column] = f64::INFINITY;
            self.parent[column] = FREE;
            self.settled[column] = false;
        }
        self.touched.clear();
        Ok(())
    }
}

pub(crate) fn min_weight_full_matching(graph: &[Vec<Edge>], columns: usize) -> Result<Vec<usize>> {
    let mut search = Search::new(graph.len(), columns);
    for start in 0..graph.len() {
        search.augment(start, graph)?;
    }
    Ok(search.column_of)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn permutations(columns: usize, rows: usize) -> Vec<Vec<usize>> {
        if rows == 0 {
            return vec![Vec::new()];
        }
        permutations(columns, rows - 1)
            .into_iter()
            .flat_map(|head| {
                (0..columns)
                    .filter(|column| !head.contains(column))
                    .map(|column| [head.clone(), vec![column]].concat())
                    .collect::<Vec<_>>()
            })
            .collect()
    }

    fn cost_of(graph: &[Vec<Edge>], chosen: &[usize]) -> Option<f64> {
        graph
            .iter()
            .zip(chosen)
            .map(|(edges, column)| {
                edges
                    .iter()
                    .filter(|edge| edge.column == *column)
                    .map(|edge| edge.cost)
                    .reduce(f64::min)
            })
            .sum()
    }

    fn brute_force(graph: &[Vec<Edge>], columns: usize) -> Option<f64> {
        permutations(columns, graph.len())
            .iter()
            .filter_map(|chosen| cost_of(graph, chosen))
            .reduce(f64::min)
    }

    fn random_graph(rng: &mut fastrand::Rng, rows: usize, columns: usize) -> Vec<Vec<Edge>> {
        let mut graph = vec![Vec::new(); rows];
        for edges in &mut graph {
            for column in 0..columns {
                if rng.u8(0..3) > 0 {
                    edges.push(Edge {
                        column,
                        cost: f64::from(rng.u32(0..1000)) / 10.0,
                    });
                }
            }
        }
        graph
    }

    #[test]
    fn matches_the_cheapest_total_of_every_small_sparse_graph() {
        let mut rng = fastrand::Rng::with_seed(7);
        let mut solved = 0;
        for _ in 0..400 {
            let rows = rng.usize(1..6);
            let columns = rng.usize(rows..8);
            let graph = random_graph(&mut rng, rows, columns);
            let best = brute_force(&graph, columns);
            let found = min_weight_full_matching(&graph, columns);
            match best {
                None => assert!(found.is_err()),
                Some(best) => {
                    let chosen = found.unwrap();
                    let mut unique = chosen.clone();
                    unique.sort_unstable();
                    unique.dedup();
                    assert_eq!(unique.len(), rows);
                    assert!((cost_of(&graph, &chosen).unwrap() - best).abs() < 1e-9);
                    solved += 1;
                }
            }
        }
        assert!(solved > 200);
    }

    #[test]
    fn fails_when_two_rows_can_only_take_the_same_column() {
        let only = vec![Edge {
            column: 0,
            cost: 1.0,
        }];
        assert!(min_weight_full_matching(&[only.clone(), only], 2).is_err());
    }
}
