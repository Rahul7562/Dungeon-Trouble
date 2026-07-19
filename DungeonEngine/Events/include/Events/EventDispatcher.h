#pragma once

#include "Core/Types.h"
#include "Events/EventType.h"
#include "Events/SubscriptionHandle.h"
#include <functional>
#include <unordered_map>
#include <vector>
#include <memory>

namespace DungeonEngine {

    class EventDispatcher {
    public:
        EventDispatcher();
        ~EventDispatcher() = default;

        // Delete copy/move
        EventDispatcher(const EventDispatcher&) = delete;
        EventDispatcher& operator=(const EventDispatcher&) = delete;

        template<typename EventT>
        SubscriptionHandle Subscribe(std::function<void(const EventT&)> callback) {
            EventTypeId typeId = EventTypeRegistry::GetTypeId<EventT>();
            SubscriptionHandle handle(++m_NextHandleId);

            auto typeErasedCallback = [cb = std::move(callback)](const void* eventData) {
                cb(*static_cast<const EventT*>(eventData));
            };

            SubscribeInternal(typeId, handle, std::move(typeErasedCallback));
            return handle;
        }

        void Unsubscribe(SubscriptionHandle handle);

        template<typename EventT>
        void Dispatch(const EventT& event) {
            EventTypeId typeId = EventTypeRegistry::GetTypeId<EventT>();
            DispatchInternal(typeId, &event);
        }

        // Allow EventQueue to dispatch type-erased events
        friend class EventQueue;

    private:
        using EventCallback = std::function<void(const void*)>;

        struct Subscriber {
            SubscriptionHandle handle;
            EventCallback callback;
            bool pendingRemoval = false;
        };

        struct SubscriberList {
            std::vector<Subscriber> subscribers;
        };

        void SubscribeInternal(EventTypeId typeId, SubscriptionHandle handle, EventCallback callback);
        void DispatchInternal(EventTypeId typeId, const void* eventData);
        void ProcessDeferredMutations();

        Core::u64 m_NextHandleId = 0;
        Core::u32 m_DispatchCount = 0;

        std::unordered_map<EventTypeId, std::unique_ptr<SubscriberList>> m_Subscribers;

        // Deferred mutations
        struct DeferredAddition {
            EventTypeId typeId;
            Subscriber subscriber;
        };
        std::vector<DeferredAddition> m_DeferredAdditions;
        std::vector<SubscriptionHandle> m_DeferredRemovals;
    };

} // namespace DungeonEngine
