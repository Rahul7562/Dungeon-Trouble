#pragma once
#include <string>
#include <variant>
#include "Core/Assert.h"

namespace Core {
    // Result type utilizing std::variant (C++17) to avoid side-by-side memory usage
    template<typename T, typename E = std::string>
    class Result {
    public:
        // Construct with success value
        Result(const T& value) : m_Data(std::in_place_index<0>, value) {}
        Result(T&& value) : m_Data(std::in_place_index<0>, std::move(value)) {}

        // Helper struct for explicit error construction
        struct ErrorType {
            E error;
        };

        // Construct with error value
        Result(ErrorType&& err) : m_Data(std::in_place_index<1>, std::move(err.error)) {}

        static Result Error(const E& error) {
            return Result(ErrorType{error});
        }

        static Result Error(E&& error) {
            return Result(ErrorType{std::move(error)});
        }

        bool IsOk() const { return m_Data.index() == 0; }
        bool IsError() const { return m_Data.index() == 1; }

        T& Get() {
            DT_ASSERT(IsOk(), "Tried to get value from an error result!");
            return std::get<0>(m_Data);
        }
        const T& Get() const {
            DT_ASSERT(IsOk(), "Tried to get value from an error result!");
            return std::get<0>(m_Data);
        }

        E& GetError() {
            DT_ASSERT(IsError(), "Tried to get error from a success result!");
            return std::get<1>(m_Data);
        }
        const E& GetError() const {
            DT_ASSERT(IsError(), "Tried to get error from a success result!");
            return std::get<1>(m_Data);
        }

    private:
        std::variant<T, E> m_Data;
    };
}
