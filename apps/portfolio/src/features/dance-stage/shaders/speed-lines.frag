// note: 顔に向かって画面の縁から細い線の束を集め、注目を集める。拍の瞬間は線を濃く長くする。
void main() {
  vec3 c = rgb(uv);
  vec2 q = (uv - joint(0)) * vec2(aspect(), 1.0);
  float a = atan(q.y, q.x);
  float r = length(q);
  float ray = hash(vec2(floor(a * 60.0), floor(time * 6.0)));
  float strength = 0.6 + 0.4 * exp(-beat * 4.0);
  float reach = mix(0.6, 0.35, strength) + ray * 0.25;
  float line = step(0.55, ray) * smoothstep(reach, reach + 0.15, r) * step(abs(fract(a * 60.0) - 0.5), 0.25);
  c = mix(c, vec3(0.05), line * strength);
  outColor = vec4(c, 1.0);
}
