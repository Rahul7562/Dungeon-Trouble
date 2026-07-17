#include "Core/UUID.h"
#include <random>

namespace Core {
    UUID::UUID() {
        thread_local std::random_device s_RandomDevice;
        thread_local std::mt19937_64 s_Engine(s_RandomDevice());
        thread_local std::uniform_int_distribution<u64> s_UniformDistribution;

        m_UUID = s_UniformDistribution(s_Engine);
    }

    UUID::UUID(u64 uuid) : m_UUID(uuid) {}
}
