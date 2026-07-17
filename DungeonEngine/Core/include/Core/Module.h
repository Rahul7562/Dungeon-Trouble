#pragma once

namespace Core {
    class IModule {
    public:
        virtual ~IModule() = default;

        virtual void Init() = 0;
        virtual void Update(float deltaTime) = 0;
        virtual void Shutdown() = 0;
    };
}
