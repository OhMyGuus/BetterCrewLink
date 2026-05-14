#include "keyhandler.h"
#include <iostream>
#include <map>
#include <uv.h>
#include "shared.h"

#ifndef _WIN32
#include "getkeystate.hpp"
#define GetAsyncKeyState X11GetKeyState
#endif

static bool IsRunning = false;
static uv_thread_t hook_tid;

enum class keystate
{
	Up,
	Down
};

std::map<int, keystate> key_map = {};

void AddKeyHandler(int keyId)
{
	if (key_map.count(keyId) == 0)
		key_map.insert(std::pair<int, keystate>(keyId, keystate::Up));
}

void ClearKeyHooks()
{
	key_map.clear();
}

void RemoveKeyHandler(int keyId)
{
}

void OnkeyUp(int keyId)
{
	emit_event(new KeyEvent{keyId, "keyup"});
}

void OnKeyDown(int keyId)
{
	emit_event(new KeyEvent{keyId, "keydown"});
}

static void keywatcher_thread(void *_arg)
{
	while (IsRunning)
	{
		for (auto const &x : key_map)
		{
			auto oldState = x.second;
			auto currentstate = (GetAsyncKeyState(x.first) & 0x8000) ? keystate::Down : keystate::Up;
			if (oldState != currentstate)
			{
				if (currentstate == keystate::Up)
					OnkeyUp(x.first);
				if (currentstate == keystate::Down)
					OnKeyDown(x.first);
			}
			key_map[x.first] = currentstate;
		}
#ifndef _WIN32
		uv_sleep(60);
#else
		Sleep(60);
#endif

	}
}

void StartKeyHandler()
{
	if (!IsRunning)
	{
		IsRunning = true;
		uv_thread_create(&hook_tid, keywatcher_thread, NULL);
	}
}
