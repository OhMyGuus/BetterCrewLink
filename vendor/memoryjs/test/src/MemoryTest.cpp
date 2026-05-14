#include <Windows.h>
#include <string>
#include <iostream>

using namespace std;

int main()
{
  cout << "type\taddress\t\tvalue" << endl;

  int _int = -2147483647;
  cout << "int\t0x" << hex << &_int << dec << "\t" << _int << endl;

  DWORD _dword = 2147483647;
  cout << "dword\t0x" << hex << &_dword << dec << "\t" << _dword << endl;

  short _short = -32768;
  cout << "short\t0x" << hex << &_short << dec << "\t" << _short << endl;

  long _long = -2147483647;
  cout << "long\t0x" << hex << &_long << dec << "\t" << _long << endl;

  float _float = 3.402823466e+38F / 2;
  cout << "float\t0x" << hex << &_float << dec << "\t" << _float << endl;

  double _double = 2.2250738585072014e-308;
  cout << "double\t0x" << hex << &_double << dec << "\t" << _double << endl;

  intptr_t _intptr_t = 2147483647;
  cout << "pointer\t0x" << hex << &_intptr_t << dec << "\t" << _intptr_t << endl;

  bool _bool = true;
  cout << "bool\t0x" << hex << &_bool << dec << "\t" << _bool << endl;

  string _string = "robert";
  cout << "string\t0x" << hex << (DWORD64)_string.c_str() << dec << "\t" << _string << endl;

  getchar();

  return 0;
}

