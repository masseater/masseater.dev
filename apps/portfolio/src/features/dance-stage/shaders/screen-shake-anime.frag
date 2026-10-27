// note: 4 拍ごとの拍に合わせて、画面を小刻みに 2 コマずつ止めながら揺らし、だんだん収める。爆発や地震の衝撃を伝える揺れ方である。
void main() {
  float since = mod(beatCount, 4.0) + beat;
  float step_ = floor(time * 12.0);
  float amp = exp(-since * 2.5) * 0.04;
  vec2 shake = (vec2(hash(vec2(step_, 1.0)), hash(vec2(step_, 2.0))) - 0.5) * amp;
  vec2 p = (uv - 0.5) / 1.06 + 0.5 + shake;
  outColor = vec4(rgb(p), 1.0);
}
