// note: 踊りを終わりから始まりへ逆向きに流す。
void main() {
  outColor = vec4(pastRgb(uv, DURATION - time), 1.0);
}
