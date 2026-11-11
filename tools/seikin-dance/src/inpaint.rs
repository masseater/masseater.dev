use std::cmp::Reverse;
use std::collections::BinaryHeap;

use crate::{HEIGHT, WIDTH};

const CHANNELS: usize = 3;
const FAR: f32 = 1e6;
const NEIGHBORS: [(isize, isize); 4] = [(-1, 0), (0, -1), (1, 0), (0, 1)];

#[derive(Clone, Copy, PartialEq)]
enum State {
    Known,
    Band,
    Inside,
}

struct March<'a> {
    colors: &'a mut [u8],
    states: Vec<State>,
    times: Vec<f32>,
    radius: isize,
}

fn at(y: isize, x: isize) -> Option<usize> {
    let inside = y >= 0 && x >= 0 && y < HEIGHT as isize && x < WIDTH as isize;
    inside.then(|| y as usize * WIDTH + x as usize)
}

impl March<'_> {
    fn filled(&self, y: isize, x: isize) -> Option<usize> {
        at(y, x).filter(|&index| self.states[index] != State::Inside)
    }

    fn slope(&self, value: impl Fn(usize) -> f32, y: isize, x: isize, step: (isize, isize)) -> f32 {
        let here = at(y, x).map_or(0.0, &value);
        let ahead = self.filled(y + step.0, x + step.1).map(&value);
        let behind = self.filled(y - step.0, x - step.1).map(&value);
        match (ahead, behind) {
            (Some(ahead), Some(behind)) => (ahead - behind) * 0.5,
            (Some(ahead), None) => ahead - here,
            (None, Some(behind)) => here - behind,
            (None, None) => 0.0,
        }
    }

    fn gradient(&self, value: impl Fn(usize) -> f32, y: isize, x: isize) -> (f32, f32) {
        (
            self.slope(&value, y, x, (1, 0)),
            self.slope(&value, y, x, (0, 1)),
        )
    }

    fn arrival(&self, first: (isize, isize), second: (isize, isize)) -> f32 {
        let first = self.filled(first.0, first.1).map(|index| self.times[index]);
        let second = self
            .filled(second.0, second.1)
            .map(|index| self.times[index]);
        match (first, second) {
            (Some(a), Some(b)) if (a - b).abs() >= 1.0 => 1.0 + a.min(b),
            (Some(a), Some(b)) => (a + b + (2.0 - (a - b) * (a - b)).sqrt()) * 0.5,
            (Some(a), None) | (None, Some(a)) => 1.0 + a,
            (None, None) => FAR,
        }
    }

    fn time(&self, y: isize, x: isize) -> f32 {
        [(-1, -1), (1, -1), (-1, 1), (1, 1)]
            .into_iter()
            .map(|(dy, dx)| self.arrival((y + dy, x), (y, x + dx)))
            .fold(FAR, f32::min)
    }

    fn paint(&mut self, y: isize, x: isize, index: usize) {
        let flow = self.gradient(|other| self.times[other], y, x);
        let mut sums = [(0.0_f32, 0.0_f32, 0.0_f32); CHANNELS];
        let mut total = 0.0_f32;
        for k in y - self.radius..=y + self.radius {
            for l in x - self.radius..=x + self.radius {
                let (dy, dx) = ((y - k) as f32, (x - l) as f32);
                let length = dy * dy + dx * dx;
                let Some(other) = self.filled(k, l) else {
                    continue;
                };
                if length > (self.radius * self.radius) as f32 {
                    continue;
                }
                let distance = 1.0 / (length * length.sqrt());
                let level = 1.0 / (1.0 + (self.times[other] - self.times[index]).abs());
                let along = dy * flow.0 + dx * flow.1;
                let direction = if along.abs() <= 0.01 { 1e-6 } else { along };
                let weight = (distance * level * direction).abs();
                for (channel, sum) in sums.iter_mut().enumerate() {
                    let color = |pixel: usize| f32::from(self.colors[pixel * CHANNELS + channel]);
                    let shade = self.gradient(color, k, l);
                    sum.0 += weight * color(other);
                    sum.1 -= weight * shade.1 * dx;
                    sum.2 -= weight * shade.0 * dy;
                }
                total += weight;
            }
        }
        if total == 0.0 {
            return;
        }
        for (channel, (color, across, down)) in sums.into_iter().enumerate() {
            let lean = (across + down) / ((across * across + down * down).sqrt() + 1e-20);
            let value = color / total + lean + 0.5;
            self.colors[index * CHANNELS + channel] = value.clamp(0.0, 255.0) as u8;
        }
    }
}

fn band(states: &[State], index: usize) -> bool {
    let (y, x) = ((index / WIDTH) as isize, (index % WIDTH) as isize);
    states[index] == State::Known
        && NEIGHBORS
            .iter()
            .any(|(dy, dx)| at(y + dy, x + dx).is_some_and(|near| states[near] == State::Inside))
}

pub(crate) fn telea(colors: &mut [u8], holes: &[u8], radius: usize) {
    let mut states: Vec<State> = holes
        .iter()
        .map(|&hole| {
            if hole == 0 {
                State::Known
            } else {
                State::Inside
            }
        })
        .collect();
    let edge: Vec<usize> = (0..states.len())
        .filter(|&index| band(&states, index))
        .collect();
    let mut heap = BinaryHeap::new();
    for &index in &edge {
        states[index] = State::Band;
        heap.push(Reverse((0_u32, index)));
    }
    let times = states
        .iter()
        .map(|&state| if state == State::Inside { FAR } else { 0.0 })
        .collect();
    let mut march = March {
        colors,
        states,
        times,
        radius: radius as isize,
    };
    while let Some(Reverse((_, index))) = heap.pop() {
        march.states[index] = State::Known;
        let (y, x) = ((index / WIDTH) as isize, (index % WIDTH) as isize);
        for (dy, dx) in NEIGHBORS {
            let Some(next) = at(y + dy, x + dx) else {
                continue;
            };
            if march.states[next] != State::Inside {
                continue;
            }
            march.times[next] = march.time(y + dy, x + dx);
            march.paint(y + dy, x + dx, next);
            march.states[next] = State::Band;
            heap.push(Reverse((march.times[next].to_bits(), next)));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::video::PIXELS;

    fn ramp() -> Vec<u8> {
        (0..PIXELS)
            .flat_map(|index| [(index % WIDTH / 4) as u8; CHANNELS])
            .collect()
    }

    #[test]
    fn telea_continues_a_horizontal_ramp_through_a_hole() {
        let original = ramp();
        let mut colors = original.clone();
        let mut holes = vec![0; PIXELS];
        for y in 100..120 {
            for x in 300..320 {
                holes[y * WIDTH + x] = 255;
                colors[(y * WIDTH + x) * CHANNELS] = 0;
            }
        }
        telea(&mut colors, &holes, 9);
        let worst = (0..PIXELS)
            .map(|index| colors[index * CHANNELS].abs_diff(original[index * CHANNELS]))
            .max();
        assert!(worst <= Some(3), "{worst:?}");
    }

    #[test]
    fn telea_leaves_an_image_without_holes_untouched() {
        let mut colors = ramp();
        telea(&mut colors, &vec![0; PIXELS], 9);
        assert_eq!(colors, ramp());
    }
}
