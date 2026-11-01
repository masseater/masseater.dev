// note: 4 拍ごとに爆発か着地が起きたことにして、画面全体を 0.4 秒だけ細かく揺らし、揺れの大きさを素早く減らす。
void main() {
  float on = step(mod(beatCount, 4.0), 0.5);
  float amp = exp(-beat * 9.0) * on * 0.03;
  vec2 shake = vec2(sin(time * 73.0), cos(time * 61.0)) * amp;
  vec2 p = (uv - 0.5) * (1.0 - amp) + 0.5 + shake;
  vec3 c = rgb(p);
  outColor = vec4(c, 1.0);
}
