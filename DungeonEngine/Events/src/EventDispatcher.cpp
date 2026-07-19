#include "Events/EventDispatcher.h"

namespace DungeonEngine {

    EventDispatcher::EventDispatcher() {}

    void EventDispatcher::SubscribeInternal(EventTypeId typeId, SubscriptionHandle handle, EventCallback callback) {
        if (m_DispatchCount > 0) {
            m_DeferredAdditions.push_back({typeId, {handle, std::move(callback), false}});
            return;
        }

        if (m_Subscribers.find(typeId) == m_Subscribers.end()) {
            m_Subscribers[typeId] = std::make_unique<SubscriberList>();
        }

        m_Subscribers[typeId]->subscribers.push_back({handle, std::move(callback), false});
    }

    void EventDispatcher::Unsubscribe(SubscriptionHandle handle) {
        if (m_DispatchCount > 0) {
            m_DeferredRemovals.push_back(handle);
            // Mark for removal early to prevent callbacks during the current dispatch
            for (auto& [typeId, list] : m_Subscribers) {
                for (auto& sub : list->subscribers) {
                    if (sub.handle == handle) {
                        sub.pendingRemoval = true;
                        return; // Found it, handles are unique
                    }
                }
            }
            return;
        }

        for (auto& [typeId, list] : m_Subscribers) {
            auto& subs = list->subscribers;
            for (auto it = subs.begin(); it != subs.end(); ++it) {
                if (it->handle == handle) {
                    subs.erase(it);
                    return; // Found it, handles are unique
                }
            }
        }
    }

    void EventDispatcher::DispatchInternal(EventTypeId typeId, const void* eventData) {
        m_DispatchCount++;

        auto it = m_Subscribers.find(typeId);
        if (it != m_Subscribers.end()) {
            for (auto& sub : it->second->subscribers) {
                if (!sub.pendingRemoval) {
                    sub.callback(eventData);
                }
            }
        }

        m_DispatchCount--;

        if (m_DispatchCount == 0) {
            ProcessDeferredMutations();
        }
    }

    void EventDispatcher::ProcessDeferredMutations() {
        if (!m_DeferredAdditions.empty()) {
            for (auto& addition : m_DeferredAdditions) {
                if (m_Subscribers.find(addition.typeId) == m_Subscribers.end()) {
                    m_Subscribers[addition.typeId] = std::make_unique<SubscriberList>();
                }
                m_Subscribers[addition.typeId]->subscribers.push_back(std::move(addition.subscriber));
            }
            m_DeferredAdditions.clear();
        }

        if (!m_DeferredRemovals.empty()) {
            for (auto handle : m_DeferredRemovals) {
                for (auto& [typeId, list] : m_Subscribers) {
                    auto& subs = list->subscribers;
                    for (auto it = subs.begin(); it != subs.end(); ) {
                        if (it->handle == handle) {
                            it = subs.erase(it);
                        } else {
                            ++it;
                        }
                    }
                }
            }
            m_DeferredRemovals.clear();
        }
    }

} // namespace DungeonEngine
