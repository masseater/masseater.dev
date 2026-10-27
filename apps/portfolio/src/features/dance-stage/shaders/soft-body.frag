// note: 薄い布を踊る人の前に上から垂らし、風で横に波打たせる。手首が近づくと布が押されて膨らみ、ひだの陰と透けて見える人の像がそれに合わせてゆがむ。
void main() {
  float bulge = 0.0;
  bulge += exp(-pow(dist(uv, joint(15)) / 0.08, 2.0));
  bulge += exp(-pow(dist(uv, joint(16)) / 0.08, 2.0));
  bulge += 0.6 * exp(-pow(dist(uv, joint(0)) / 0.1, 2.0));
  float hang = uv.y;
  float wave = sin(uv.x * 34.0 + sin(time * 1.3 + uv.y * 2.5) * 3.0 * hang + time * 0.8) * (0.3 + 0.7 * hang);
  float fold = cos(uv.x * 34.0 + sin(time * 1.3 + uv.y * 2.5) * 3.0 * hang + time * 0.8);
  vec2 offset = vec2(wave * 0.006 * hang + bulge * 0.02, bulge * 0.01);
  vec3 through = rgb(uv + offset);
  float shade = 0.75 + 0.2 * fold * (0.3 + 0.7 * hang) + 0.25 * bulge;
  vec3 cloth = vec3(0.95, 0.93, 0.98) * shade;
  vec3 c = mix(through, cloth, 0.55 - 0.15 * bulge);
  c = mix(c, vec3(0.35, 0.3, 0.3), step(uv.y, 0.025));
  outColor = vec4(c, 1.0);
}
