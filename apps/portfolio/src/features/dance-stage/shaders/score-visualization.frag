// note: 画面の右から左へ流れるピアノロールを踊る人の後ろに置き、中央の再生線を通る音符だけを光らせる。左には鍵盤を描き、鳴っている高さの鍵を色づける。
void main() {
  vec3 c = vec3(0.07, 0.07, 0.1);
  float lanes = 24.0;
  float lane = floor(uv.y * lanes);
  float black = step(0.5, hash(vec2(mod(lane, 12.0), 3.0)));
  c += vec3(0.03) * black;
  float speed = 0.25;
  float x = uv.x + time * speed;
  float slot = floor(x * 8.0);
  float pitch = floor(hash(vec2(slot, 1.0)) * lanes);
  float pitch2 = floor(hash(vec2(slot, 2.0)) * lanes);
  float len = 0.5 + 0.45 * hash(vec2(slot, 5.0));
  float inNote = step(fract(x * 8.0), len) * (step(abs(lane - pitch), 0.0) + step(abs(lane - pitch2), 0.0) * step(0.5, hash(vec2(slot, 9.0))));
  float headSlot = floor((0.5 + time * speed) * 8.0);
  float lit = step(abs(slot - headSlot), 0.0);
  vec3 noteColor = mix(vec3(0.3, 0.5, 0.9), vec3(1.0, 0.8, 0.3), lit);
  c = mix(c, noteColor, min(inNote, 1.0) * 0.9);
  c = mix(c, rgb(uv), matte(uv) * 0.85);
  c = mix(c, vec3(1.0, 0.3, 0.3), step(abs(uv.x - 0.5) * aspect(), 0.002));
  if (uv.x < 0.05) {
    float headPitch = floor(hash(vec2(headSlot, 1.0)) * lanes);
    vec3 key = mix(vec3(0.95), vec3(0.15), black);
    key = mix(key, vec3(1.0, 0.75, 0.2), step(abs(lane - headPitch), 0.0));
    c = key * (0.85 + 0.15 * step(0.08, fract(uv.y * lanes)));
  }
  outColor = vec4(c, 1.0);
}
