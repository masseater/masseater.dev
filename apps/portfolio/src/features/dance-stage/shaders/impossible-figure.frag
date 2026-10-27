// note: ペンローズの三角形を描き、3 本の棒の面に踊りの映像を貼る。どの角でも手前の棒が次の棒の上を通るので、角ごとには正しくつながって見えるのに、全体ではありえない立体になる。全体がゆっくり回る。
float along(vec2 p, vec2 a, vec2 b) { return dot(p - a, normalize(b - a)) / length(b - a); }
float across(vec2 p, vec2 a, vec2 b) { vec2 d = normalize(b - a); return dot(p - a, vec2(d.y, -d.x)); }
void main() {
  vec2 q = rot((uv - 0.5) * vec2(aspect(), 1.0), time * 0.15);
  vec2 vs[3] = vec2[3](vec2(0.0, -0.4), vec2(0.37, 0.24), vec2(-0.37, 0.24));
  vec3 shades[3] = vec3[3](vec3(1.0), vec3(0.72), vec3(0.48));
  float w = 0.1;
  int hit = -1;
  float u = 0.0;
  float v = 0.0;
  for (int k = 0; k < 3; k++) {
    int i = 2 - k;
    vec2 a = vs[i];
    vec2 b = vs[(i + 1) % 3];
    float s = along(q, a, b);
    float t = across(q, a, b);
    float inner = t / w;
    float extend = w * 1.7 / length(b - a);
    if (inner > 0.0 && inner < 1.0 && s > -extend * (1.0 - inner) && s < 1.0 + extend * inner) {
      bool covered = hit == (i + 2) % 3 && s > 0.5;
      if (!covered) { hit = i; u = s; v = inner; }
    }
  }
  vec3 c = vec3(0.92, 0.9, 0.86);
  if (hit >= 0) {
    vec3 face = rgb(vec2(0.2 + 0.7 * clamp(u, 0.0, 1.0), 0.15 + 0.7 * v));
    c = face * shades[hit];
    c = mix(c, vec3(0.1), step(0.94, v) + step(v, 0.04));
  }
  outColor = vec4(c, 1.0);
}
