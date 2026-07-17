#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Core/Result.h"

// Non-default constructible type for testing
class ComplexType {
public:
    ComplexType(int x, float y) : m_X(x), m_Y(y) {}
    ComplexType() = delete;

    int GetX() const { return m_X; }

private:
    int m_X;
    float m_Y;
};

TEST_CASE("Result Success and Error paths") {
    Core::Result<ComplexType> res(ComplexType(42, 3.14f));
    REQUIRE(res.IsOk());
    REQUIRE(!res.IsError());
    REQUIRE(res.Get().GetX() == 42);

    Core::Result<ComplexType> err = Core::Result<ComplexType>::Error("Something went wrong");
    REQUIRE(!err.IsOk());
    REQUIRE(err.IsError());
    REQUIRE(err.GetError() == "Something went wrong");
}
