// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Counter {
  uint public x;

  event Increment(uint by);

  function inc() public {
    x++;
    emit Increment(1);
  }
}
