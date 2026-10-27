// note: 色の違う 3 つの部屋を横に並べた長い 1 枚の舞台にし、カメラが切らずに横へ流れて部屋から部屋へ渡っていく。どの部屋でも同じ人が踊り続けている。
void main() {
  float pan = fract(time / 9.0) * 2.0;
  float x = uv.x + pan;
  float room = floor(x);
  float local = fract(x);
  vec2 p = vec2(local, uv.y);
  vec3 c = pastRgb(p, time - room * 0.4);
  vec3 tints[3] = vec3[3](vec3(1.0, 0.85, 0.75), vec3(0.75, 0.9, 1.0), vec3(0.85, 1.0, 0.8));
  float m = pastMatte(p, time - room * 0.4);
  c = mix(c * tints[int(mod(room, 3.0))], c, m);
  c = mix(c, vec3(0.2, 0.15, 0.1), smoothstep(0.02, 0.0, min(local, 1.0 - local)));
  outColor = vec4(c, 1.0);
}
