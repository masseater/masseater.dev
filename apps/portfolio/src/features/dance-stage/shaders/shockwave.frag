// note: 拍のたびに踊る人の胴から輪を広げ、輪の通る所だけ画面を外向きに押してゆがませる。輪は広がるほど弱まる。
void main() {
  vec2 center = bodyCenter();
  vec2 d = (uv - center) * vec2(aspect(), 1.0);
  float r = length(d);
  float front = beat * 1.2;
  float band = exp(-pow((r - front) / 0.03, 2.0)) * exp(-beat * 3.0);
  vec2 dir = d / max(r, 1e-4);
  vec2 p = uv - dir / vec2(aspect(), 1.0) * band * 0.04;
  vec3 c = rgb(p);
  c += vec3(0.6, 0.8, 1.0) * band * 0.25;
  outColor = vec4(c, 1.0);
}
