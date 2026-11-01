// note: 1 枚の色紙を三角形の面に折り分けたように、踊る人の形を折り面の集まりで描く。6 秒ごとに正方形の紙から折り面が 1 つずつ人の形へ移っていく。
void main() {
  vec2 q = uv * vec2(aspect(), 1.0) * 28.0;
  vec2 cell = floor(q);
  vec2 f = fract(q);
  float upper = step(f.x, f.y);
  vec2 tri = cell + vec2(upper * 0.5, 0.0);
  vec2 center = (cell + mix(vec2(0.67, 0.33), vec2(0.33, 0.67), upper)) / 28.0 / vec2(aspect(), 1.0);
  float phase = fract(time / 6.0);
  float fold = smoothstep(0.1, 0.7, phase - hash(tri) * 0.25);
  vec2 sq = abs(center - vec2(0.5)) * vec2(aspect(), 1.0);
  float inSquare = step(max(sq.x, sq.y), 0.3);
  float inBody = step(0.5, matte(center));
  float on = mix(inSquare, inBody, fold);
  float face = 0.65 + 0.35 * hash(tri + 0.5);
  vec3 paper = vec3(0.85, 0.2, 0.25) * face;
  float crease = smoothstep(0.04, 0.0, min(min(f.x, f.y), abs(f.x - f.y)));
  vec3 c = mix(vec3(0.94, 0.92, 0.88), paper * (1.0 - crease * 0.3), on);
  outColor = vec4(c, 1.0);
}
