// note: 同じ顔の寄りのあいだに、湯気の立つ器、花、雨雲の 3 つの絵を交互にはさむ。顔は同じなのに、間の絵によって表情の意味が違って見える。
void main() {
  float slot = mod(floor(time / 1.2), 6.0);
  vec3 c;
  if (mod(slot, 2.0) < 0.5) {
    vec2 p = (uv - 0.5) / 3.0 + joint(0);
    c = vec3(luma(rgb(p)));
  } else {
    float k = floor(slot / 2.0);
    vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
    if (k < 0.5) {
      c = vec3(0.2, 0.15, 0.12);
      float bowl = step(length(q * vec2(1.0, 2.2) - vec2(0.0, 0.3)), 0.35) * step(0.1, q.y);
      c = mix(c, vec3(0.9, 0.88, 0.85), bowl);
      float steam = smoothstep(0.03, 0.0, abs(q.x - 0.06 * sin(q.y * 20.0 + time * 3.0))) * step(q.y, 0.05) * step(-0.35, q.y);
      c += steam * 0.5;
    } else if (k < 1.5) {
      c = vec3(0.85, 0.9, 0.8);
      float a = atan(q.y, q.x);
      float r = length(q);
      float petal = step(r, 0.18 + 0.08 * cos(a * 5.0));
      c = mix(c, vec3(0.95, 0.45, 0.6), petal);
      c = mix(c, vec3(0.95, 0.8, 0.2), step(r, 0.06));
    } else {
      c = mix(vec3(0.3, 0.32, 0.38), vec3(0.15, 0.16, 0.2), uv.y);
      c = mix(c, vec3(0.45, 0.47, 0.52), step(0.55, fbm(uv * vec2(4.0, 6.0) + time * 0.1)) * step(uv.y, 0.5));
      c += step(0.97, hash(floor(uv * vec2(120.0, 20.0) + vec2(0.0, -time * 30.0)))) * 0.3 * step(0.45, uv.y);
    }
  }
  outColor = vec4(c, 1.0);
}
