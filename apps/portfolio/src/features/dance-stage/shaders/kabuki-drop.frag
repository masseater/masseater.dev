// note: 赤と白の縞の幕で舞台を隠しておき、5 秒ごとに吊りを外して幕を一瞬で床へ落とし、後ろで踊る人を現す。落ちる幕は裾がはためく。
void main() {
  float phase = mod(time, 5.0);
  float fallT = max(phase - 2.0, 0.0);
  float drop = 0.5 * 5.0 * fallT * fallT;
  vec3 c = rgb(uv);
  float top = drop;
  float flutter = sin(uv.x * 20.0 + fallT * 30.0) * 0.02 * step(0.001, fallT);
  if (uv.y > top + flutter && uv.y - drop < 1.0) {
    float y = uv.y - drop;
    float stripe = step(0.5, fract(uv.x * 6.0 + sin(y * 10.0) * 0.02));
    vec3 cloth = mix(vec3(0.85, 0.1, 0.12), vec3(0.96, 0.94, 0.9), stripe);
    cloth *= 0.8 + 0.2 * sin(uv.x * 60.0 + y * 3.0);
    c = cloth;
  }
  outColor = vec4(c, 1.0);
}
