// note: 4 分の 1 の速さで流し、間のコマは前後のコマを混ぜて埋める。腕の振りや服の揺れがゆっくり見える。
void main() {
  outColor = vec4(pastRgb(uv, time * 0.25 + 4.0), 1.0);
}
