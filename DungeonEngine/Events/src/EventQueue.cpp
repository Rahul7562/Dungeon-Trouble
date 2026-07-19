#include "Events/EventQueue.h"
#include <cstring>

namespace DungeonEngine {

    EventQueue::EventQueue(Core::u32 initialCapacity)
        : m_Head(0), m_Tail(0) {
        m_Buffer.resize(initialCapacity);
    }

    EventQueue::~EventQueue() {
        Clear();
    }

    void* EventQueue::AllocateSpace(EventTypeId typeId, Core::u32 size, Core::u32 alignment, void (*destructor)(void*)) {
        // Calculate alignment padding for the EventHeader
        Core::u32 headerAlignment = alignof(EventHeader);
        Core::u32 currentPos = m_Head;

        // Align for header
        Core::u32 headerPadding = (headerAlignment - (currentPos % headerAlignment)) % headerAlignment;
        Core::u32 headerPos = currentPos + headerPadding;

        // Align for payload after header
        Core::u32 payloadPosRaw = headerPos + sizeof(EventHeader);
        Core::u32 payloadPadding = (alignment - (payloadPosRaw % alignment)) % alignment;
        Core::u32 payloadPos = payloadPosRaw + payloadPadding;

        Core::u32 totalSize = (payloadPos - currentPos) + size;

        // Resize buffer if needed
        if (m_Head + totalSize > m_Buffer.size()) {
            Core::u32 newCapacity = m_Buffer.size() * 2;
            while (m_Head + totalSize > newCapacity) {
                newCapacity *= 2;
            }
            m_Buffer.resize(newCapacity);
        }

        // Store header
        EventHeader* header = reinterpret_cast<EventHeader*>(&m_Buffer[headerPos]);
        header->typeId = typeId;
        header->size = size;
        header->alignmentPadding = payloadPadding;
        header->destructor = destructor;

        m_Head += totalSize;

        return &m_Buffer[payloadPos];
    }

    void EventQueue::Clear() {
        m_Tail = 0;

        while (m_Tail < m_Head) {
            Core::u32 headerAlignment = alignof(EventHeader);
            Core::u32 headerPadding = (headerAlignment - (m_Tail % headerAlignment)) % headerAlignment;
            Core::u32 headerPos = m_Tail + headerPadding;

            EventHeader* header = reinterpret_cast<EventHeader*>(&m_Buffer[headerPos]);
            Core::u32 payloadPos = headerPos + sizeof(EventHeader) + header->alignmentPadding;

            if (header->destructor) {
                header->destructor(&m_Buffer[payloadPos]);
            }

            m_Tail = payloadPos + header->size;
        }

        m_Head = 0;
        m_Tail = 0;
    }

    void EventQueue::DispatchAll(EventDispatcher& dispatcher) {
        if (m_Head == 0) return;

        // Swap to avoid UAF if callbacks enqueue more events
        std::vector<Core::u8> processBuffer = std::move(m_Buffer);
        Core::u32 processHead = m_Head;

        // Reset the active queue to empty (ready for new enqueues during dispatch)
        m_Buffer.clear();
        m_Buffer.resize(processBuffer.size()); // Keep capacity
        m_Head = 0;
        m_Tail = 0;

        Core::u32 tail = 0;
        while (tail < processHead) {
            Core::u32 headerAlignment = alignof(EventHeader);
            Core::u32 headerPadding = (headerAlignment - (tail % headerAlignment)) % headerAlignment;
            Core::u32 headerPos = tail + headerPadding;

            EventHeader* header = reinterpret_cast<EventHeader*>(&processBuffer[headerPos]);
            Core::u32 payloadPos = headerPos + sizeof(EventHeader) + header->alignmentPadding;

            // Dispatch
            dispatcher.DispatchInternal(header->typeId, &processBuffer[payloadPos]);

            // Destroy
            if (header->destructor) {
                header->destructor(&processBuffer[payloadPos]);
            }

            tail = payloadPos + header->size;
        }
    }

} // namespace DungeonEngine
