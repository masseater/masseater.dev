// note: 1 枚の赤い紙から踊る人を切り出す。体の中にも丸と三日月の透かしを切るが、どの部分も細い橋で紙の外枠とつながったまま残る。
void main() {
  float m = matte(uv);
  vec2 q = uv * vec2(aspect(), 1.0) * 40.0;
  vec2 f = fract(q) - 0.5;
  float hole = step(length(f), 0.28) * (1.0 - step(length(f - vec2(0.12, 0.0)), 0.22) * step(0.5, hash(floor(q))));
  float border = 1.0 - step(0.03, uv.x) * step(uv.x, 0.97) * step(0.05, uv.y) * step(uv.y, 0.95);
  float paper = max(m * (1.0 - hole * step(0.7, matte(uv + vec2(0.01, 0.0)) * matte(uv - vec2(0.01, 0.0)))), border);
  float tie = step(abs(uv.y - joint(0).y + 0.06), 0.004) * step(uv.x, joint(0).x) + step(abs(uv.x - (joint(27).x + joint(28).x) * 0.5), 0.004) * step((joint(27).y + joint(28).y) * 0.5, uv.y);
  paper = max(paper, tie);
  vec3 c = mix(vec3(0.97, 0.95, 0.9), vec3(0.8, 0.08, 0.1), paper);
  c = mix(c, c * 0.8, step(0.5, matte(uv - vec2(0.004, 0.007))) * (1.0 - paper));
  outColor = vec4(c, 1.0);
}
