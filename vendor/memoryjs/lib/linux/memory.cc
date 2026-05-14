#include <node.h>
#include <vector>
#include "memory.h"

memory::memory() {}
memory::~memory() {}

void memory::readMemoryData(pid_t pid, uintptr_t address, void *buffer, size_t size) {
    struct iovec remote_iov = {.iov_base = (void*)address, .iov_len = size };
    struct iovec local_iov = {.iov_base = buffer, .iov_len = size };
    ssize_t rc = process_vm_readv(pid, &local_iov, 1, &remote_iov, 1, 0);

    if (rc < 0 || (size_t) rc != size) {
    //    printf("error: process_vm_readv returned %zd instead of %zu (%s) address=%#lx \n", rc, size, strerror(errno), address);
        memset(buffer, 0, size);
    }
}
