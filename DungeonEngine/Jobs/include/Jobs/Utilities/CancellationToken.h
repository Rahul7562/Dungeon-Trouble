#pragma once
#include <memory>
#include "Threading/Utilities/AtomicBool.h"

namespace DungeonEngine::Jobs {

    class CancellationTokenSource;

    class CancellationToken {
    public:
        CancellationToken() = default;
        CancellationToken(std::shared_ptr<Threading::AtomicBool> flag) : m_Flag(std::move(flag)) {}

        bool IsCancellationRequested() const {
            if (m_Flag) {
                return m_Flag->Get();
            }
            return false;
        }

    private:
        std::shared_ptr<Threading::AtomicBool> m_Flag;
    };

    class CancellationTokenSource {
    public:
        CancellationTokenSource() : m_Flag(std::make_shared<Threading::AtomicBool>(false)) {}

        void Cancel() {
            if (m_Flag) {
                m_Flag->Set(true);
            }
        }

        CancellationToken GetToken() const {
            return CancellationToken(m_Flag);
        }

    private:
        std::shared_ptr<Threading::AtomicBool> m_Flag;
    };

} // namespace DungeonEngine::Jobs
