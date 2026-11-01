// note: 走査線ごとに横へずらす量を波打たせて、踊る人の形を引き伸ばしたりねじったりする。色は明るさから青と紫と橙の光に置き換え、前のコマの光を少し残す。
// pass: trail persistent
uniform sampler2D trail;
void main() {
  float line = floor(uv.y * 270.0);
  float shift = sin(line * 0.05 + time * 2.0) * 0.06 * (0.5 + 0.5 * sin(time * 0.7));
  vec2 p = vec2(uv.x + shift, uv.y);
  float l = luma(rgb(p)) * matte(p);
  vec3 neon = l > 0.5 ? vec3(1.0, 0.6, 0.2) : vec3(0.4, 0.3, 1.0) * step(0.1, l);
  vec3 last = read(trail, uv + vec2(0.003, 0.0)).rgb * 0.85;
  outColor = vec4(max(neon * step(0.5, fract(uv.y * 270.0)), last), 1.0);
}
// pass:
uniform sampler2D trail;
void main() {
  outColor = vec4(read(trail, uv).rgb, 1.0);
}
