#pragma once

#include "Core/Types.h"
#include "Events/EventDispatcher.h"
#include "Events/EventQueue.h"
#include "Events/EventChannel.h"
#include <array>

namespace DungeonEngine {

    class EventBus {
    public:
        EventBus() {
            for (auto& queue : m_Queues) {
                // Initialize with a reasonable default capacity
                queue = std::make_unique<EventQueue>(4096);
            }
        }

        ~EventBus() = default;

        // Delete copy/move
        EventBus(const EventBus&) = delete;
        EventBus& operator=(const EventBus&) = delete;

        template<typename EventT>
        SubscriptionHandle Subscribe(std::function<void(const EventT&)> callback) {
            return m_Dispatcher.Subscribe<EventT>(std::move(callback));
        }

        void Unsubscribe(SubscriptionHandle handle) {
            m_Dispatcher.Unsubscribe(handle);
        }

        template<typename EventT>
        void DispatchImmediate(const EventT& event) {
            m_Dispatcher.Dispatch<EventT>(event);
        }

        template<typename EventT>
        void Enqueue(EventChannel channel, const EventT& event) {
            Core::u8 channelIdx = static_cast<Core::u8>(channel);
            if (channelIdx < static_cast<Core::u8>(EventChannel::COUNT)) {
                m_Queues[channelIdx]->Enqueue<EventT>(event);
            }
        }

        void DispatchAllQueues() {
            for (auto& queue : m_Queues) {
                queue->DispatchAll(m_Dispatcher);
            }
        }

        void DispatchQueue(EventChannel channel) {
            Core::u8 channelIdx = static_cast<Core::u8>(channel);
            if (channelIdx < static_cast<Core::u8>(EventChannel::COUNT)) {
                m_Queues[channelIdx]->DispatchAll(m_Dispatcher);
            }
        }

        void ClearAllQueues() {
            for (auto& queue : m_Queues) {
                queue->Clear();
            }
        }

    private:
        EventDispatcher m_Dispatcher;
        std::array<std::unique_ptr<EventQueue>, static_cast<std::size_t>(EventChannel::COUNT)> m_Queues;
    };

} // namespace DungeonEngine
