// note: 人物だけを逆向きに流し、背景はそのままにする。逆再生リップシンクは撮る時に動きを逆に演じ、映像を逆にして口だけ合わせる。ここでは音声を使えないので、逆向きの体の動きの不自然さだけを見せる。
void main() {
  float t = DURATION - time;
  vec3 c = mix(plate(uv), pastRgb(uv, t), pastMatte(uv, t));
  outColor = vec4(c, 1.0);
}
