import unittest

import numpy as np

from mosaic.solve import assign

TILES = 7
CELLS = 6
STEP = 0.1


class AssignTest(unittest.TestCase):
    def test_each_cell_gets_the_tile_of_its_own_colour_from_a_tiny_pool(self):
        pool = np.repeat(np.arange(TILES, dtype=np.float32)[:, None] * STEP, 3, axis=1)
        cells = pool[:CELLS].copy()
        weights = np.ones((CELLS, 1), dtype=np.float32)
        chosen = assign(cells, weights, pool, np.zeros(TILES))
        self.assertEqual(chosen.tolist(), list(range(CELLS)))


if __name__ == "__main__":
    unittest.main()
