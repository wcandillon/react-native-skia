#pragma once

namespace RNSkia {

// One overload per alternative of a variant, for std::visit: an alternative
// left out does not compile.
template <class... Visitors> struct Overloaded : Visitors... {
  using Visitors::operator()...;
};
template <class... Visitors> Overloaded(Visitors...) -> Overloaded<Visitors...>;

} // namespace RNSkia
