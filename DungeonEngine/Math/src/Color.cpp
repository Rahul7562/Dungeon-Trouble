#include "Math/Color.h"

namespace DungeonEngine::Math {

Color Color::fromHSV(float h, float s, float v, float a) noexcept {
    if (s <= 0.0f) {
        return Color(v, v, v, a);
    }

    float hh = wrap(h, 0.0f, 360.0f);
    hh /= 60.0f;
    int i = static_cast<int>(hh);
    float ff = hh - i;

    float p = v * (1.0f - s);
    float q = v * (1.0f - (s * ff));
    float t = v * (1.0f - (s * (1.0f - ff)));

    switch(i) {
        case 0: return Color(v, t, p, a);
        case 1: return Color(q, v, p, a);
        case 2: return Color(p, v, t, a);
        case 3: return Color(p, q, v, a);
        case 4: return Color(t, p, v, a);
        case 5: default: return Color(v, p, q, a);
    }
}

} // namespace DungeonEngine::Math
