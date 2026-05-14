#include <node.h>
#include <vector>
#include <dirent.h>
#include <cstring>
#include "process.h"
#include "memoryjs.h"

process::process() {}
process::~process() {}

using v8::Exception;
using v8::Isolate;
using v8::String;

pid_t process::openProcess(const char* processName, const char** errorMessage){
    pid_t processPid = -1;


    DIR *dir = opendir("/proc");
    if (dir == NULL) {
        *errorMessage = "unable to open /proc";
        return -1;
    }

    struct dirent *ent;
    while ((ent = readdir(dir)) != NULL) {
        pid_t pid = strtol(ent->d_name, NULL, 0);
        if (pid == 0) {
            continue;
        }

        char comm_path[4096];
        snprintf(comm_path, sizeof(comm_path), "/proc/%d/comm", pid);

        FILE *f = fopen(comm_path, "r");
        if (f == NULL) {
            continue;
        }

        char comm[4096];
        ssize_t rc = fread(comm, 1, sizeof(comm), f);
        if (rc > 1) {
            comm[rc - 1] = '\0';
            if (strcmp(comm, processName) == 0) {
                processPid = pid;
                fclose(f);
                break;
            }
        }
        fclose(f);
    }

    closedir(dir);


    if (processPid < 0) {
        *errorMessage = "unable to find process";
    }

    return processPid;
}

std::vector<process::processStat> process::getProcesses(const char **errorMessage) {
    std::vector<process::processStat> result;
    char procStatPath[4096];

    DIR *dir = opendir("/proc");
    if (dir == NULL) {
        *errorMessage = "unable to open /proc";
        return result;
    }

    struct dirent *ent;
    while ((ent = readdir(dir)) != NULL) {
        struct process::processStat pstat;
        pid_t pid = strtol(ent->d_name, NULL, 0);

        if (pid == 0) {
            continue;
        }

        sprintf(procStatPath, "/proc/%d/stat", pid);

        FILE *statFile = fopen(procStatPath, "r");

        // If we can't open a /proc/#/stat file just skip it.
        if (statFile == NULL) {
            continue;
        }

        // Get the position of the last ")" character.
        // From: https://unix.stackexchange.com/a/581565
        off_t bracketPos = 0;

        while (1) {
            char c = fgetc(statFile);
            if (c == EOF) break;
            if (c == ')') bracketPos = ftell(statFile);
        }
        fseek(statFile, 0, SEEK_SET);

        int rc = fscanf(statFile, "%d ", &pstat.pid);

        if (rc == EOF) {
            *errorMessage = "failed to read from /proc/#/stat";
            return result;
        }

        size_t commIndex = 0;
        
        // Skip the first "(" character
        fseek(statFile, 1, SEEK_CUR);

        while (ftell(statFile) < bracketPos) {
            char c = fgetc(statFile);
            pstat.comm[commIndex++] = c;
        }
        // Discard the last ")" character
        pstat.comm[commIndex - 1] = '\0';

        if (rc == EOF) {
            *errorMessage = "failed to read from /proc/#/stat";
            return result;
        }

        fclose(statFile);

        result.push_back(pstat);
    }

    closedir(dir);

    return result;
}
