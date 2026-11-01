// note: 赤を一切使わずに踊りを映す。画のすべての色から赤の成分を抜き、文章は「い」を一度も使わずに書いた。
// text: 「い」を　つかわずに　かく
// text: うでを　あげて　ひざを　まげて　まわる
void main() {
  vec3 src = rgb(uv);
  vec3 c = vec3(0.0, src.g, src.b);
  c = mix(c, vec3(0.0, 0.0, 0.0), textBox(uv - vec2(0.003, 0.005), vec2(0.5, 0.1), 0.07, 0) * 0.7);
  c = mix(c, vec3(0.0, 1.0, 1.0), textBox(uv, vec2(0.5, 0.1), 0.07, 0));
  c = mix(c, vec3(0.0, 0.0, 0.0), textBox(uv - vec2(0.003, 0.005), vec2(0.5, 0.9), 0.06, 1) * 0.7);
  c = mix(c, vec3(0.0, 0.95, 0.85), textBox(uv, vec2(0.5, 0.9), 0.06, 1));
  outColor = vec4(c, 1.0);
}
