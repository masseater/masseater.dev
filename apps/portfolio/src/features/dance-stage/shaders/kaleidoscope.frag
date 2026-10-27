// note: 画面の中心のまわりを 8 つの扇に分け、1 つの扇の中の踊りを鏡で折り返して並べる。全体がゆっくり回り、左右対称の模様になる。
void main() {
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  float r = length(q);
  float a = atan(q.y, q.x) + time * 0.2;
  float sector = PI / 4.0;
  a = mod(a, sector);
  a = min(a, sector - a);
  vec2 p = vec2(cos(a), sin(a)) * r;
  p = p / vec2(aspect(), 1.0) * 1.2 + bodyCenter() - vec2(0.05, 0.0);
  outColor = vec4(rgb(p), 1.0);
}
