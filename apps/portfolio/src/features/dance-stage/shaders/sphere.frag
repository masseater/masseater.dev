// note: 夜の街に建つ巨大な球の表面いっぱいに踊る人の映像を貼り、球を回すようにゆっくり流す。周りのビルの窓には小さな灯りをともす。
void main() {
  vec3 c = mix(vec3(0.02, 0.02, 0.08), vec3(0.12, 0.06, 0.2), uv.y);
  float bx = floor(uv.x * 30.0);
  float bh = 0.6 + 0.3 * hash(vec2(bx, 2.0));
  if (uv.y > bh) {
    c = vec3(0.05, 0.05, 0.08);
    vec2 w = fract(vec2(uv.x * 30.0 * 4.0, uv.y * 60.0));
    c += vec3(1.0, 0.8, 0.5) * step(0.6, w.x) * step(0.5, w.y) * step(0.6, hash(floor(vec2(uv.x * 120.0, uv.y * 60.0)))) * 0.5;
  }
  vec2 center = vec2(0.5, 0.48);
  vec2 d = (uv - center) * vec2(aspect(), 1.0) / 0.4;
  float r = length(d);
  if (r < 1.0) {
    vec3 n = vec3(d.x, -d.y, sqrt(1.0 - r * r));
    float lon = atan(n.x, n.z) / PI * 0.5 + 0.5 + time * 0.03;
    float lat = 0.5 - asin(n.y) / PI;
    vec2 q = vec2(fract(lon * 2.0), lat);
    q.x = abs(q.x * 2.0 - 1.0);
    vec3 screen = rgb(vec2(0.15 + q.x * 0.7, q.y));
    c = screen * (0.55 + 0.45 * n.z) * 1.2;
    c += vec3(0.1) * step(0.97, fract(lon * 120.0));
  }
  c += vec3(0.3, 0.25, 0.4) * exp(-max(r - 1.0, 0.0) * 8.0) * step(1.0, r) * 0.4;
  outColor = vec4(c, 1.0);
}
