from typing import Generic, TypeVar

T = TypeVar("T")


class Box(Generic[T]):
  def __init__(self, content: T):
    self.content: T = content


int_box: Box[int] = Box(10)
