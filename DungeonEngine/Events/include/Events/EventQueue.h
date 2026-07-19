#pragma once

#include "Core/Types.h"
#include "Events/EventType.h"
#include "Events/EventDispatcher.h"
#include <vector>
#include <memory>
#include <type_traits>
#include <new>

namespace DungeonEngine {

    // Helper to generate a destructor function pointer for a specific type
    template<typename T>
    void EventDestructorWrapper(void* ptr) {
        static_cast<T*>(ptr)->~T();
    }

    class EventQueue {
    public:
        EventQueue(Core::u32 initialCapacity = 4096);
        ~EventQueue();

        // Delete copy/move
        EventQueue(const EventQueue&) = delete;
        EventQueue& operator=(const EventQueue&) = delete;

        template<typename EventT>
        void Enqueue(const EventT& event) {
            static_assert(std::is_trivially_copyable_v<EventT>, "Deferred queued events must be trivially copyable.");
            EventTypeId typeId = EventTypeRegistry::GetTypeId<EventT>();
            Core::u32 size = sizeof(EventT);
            Core::u32 alignment = alignof(EventT);

            void* dest = AllocateSpace(typeId, size, alignment, &EventDestructorWrapper<EventT>);
            new(dest) EventT(event);
        }

        void DispatchAll(EventDispatcher& dispatcher);
        void Clear();

    private:
        struct EventHeader {
            EventTypeId typeId;
            Core::u32 size;
            Core::u32 alignmentPadding; // Added to help skip correctly
            void (*destructor)(void*);
        };

        void* AllocateSpace(EventTypeId typeId, Core::u32 size, Core::u32 alignment, void (*destructor)(void*));

        std::vector<Core::u8> m_Buffer;
        Core::u32 m_Head; // Write position
        Core::u32 m_Tail; // Read position (used during dispatch)
    };

} // namespace DungeonEngine
