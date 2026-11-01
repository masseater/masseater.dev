// note: 全体の踊りの右下に小窓を置き、同じ瞬間の顔のアップを映す。2 つの見え方を同時に見せる。
void main() {
  vec3 c = rgb(uv);
  vec2 box = (uv - vec2(0.68, 0.64)) / vec2(0.28, 0.32);
  if (inside(box) > 0.5) {
    vec2 p = joint(0) + (box - 0.5) * vec2(0.22, 0.3);
    c = rgb(p);
    float border = step(box.x, 0.015) + step(0.985, box.x) + step(box.y, 0.02) + step(0.98, box.y);
    c = mix(c, vec3(1.0), min(border, 1.0));
  }
  outColor = vec4(c, 1.0);
}
