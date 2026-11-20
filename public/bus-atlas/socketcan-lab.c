/* Linux SocketCAN example. Transmits one fixed frame on vcan-wire only. */
#define _POSIX_C_SOURCE 200809L

#include <errno.h>
#include <linux/can.h>
#include <linux/can/raw.h>
#include <net/if.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>

static int open_can(void)
{
    unsigned int index = if_nametoindex("vcan-wire");
    if (index == 0) {
        perror("if_nametoindex(vcan-wire)");
        return -1;
    }

    int fd = socket(PF_CAN, SOCK_RAW, CAN_RAW);
    if (fd == -1) {
        perror("socket");
        return -1;
    }

    struct sockaddr_can addr = {
        .can_family = AF_CAN,
        .can_ifindex = (int)index,
    };
    struct can_filter filter = {
        .can_id = 0x123,
        .can_mask = CAN_SFF_MASK | CAN_EFF_FLAG | CAN_RTR_FLAG,
    };
    struct timeval timeout = { .tv_sec = 10 };
    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) == -1 ||
        setsockopt(fd, SOL_CAN_RAW, CAN_RAW_FILTER, &filter, sizeof(filter)) == -1 ||
        setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout)) == -1) {
        perror("SocketCAN setup");
        close(fd);
        return -1;
    }

    return fd;
}

int main(int argc, char **argv)
{
    if (argc != 2 || (strcmp(argv[1], "rx") != 0 && strcmp(argv[1], "tx") != 0)) {
        fprintf(stderr, "Usage: %s rx|tx\n", argv[0]);
        return EXIT_FAILURE;
    }

    int fd = open_can();
    if (fd == -1)
        return EXIT_FAILURE;

    struct can_frame frame = { .can_id = 0x123, .len = 2, .data = { 0x11, 0x22 } };
    int transmit = strcmp(argv[1], "tx") == 0;
    ssize_t size = transmit ? write(fd, &frame, CAN_MTU) : read(fd, &frame, CAN_MTU);
    if (size == -1) {
        perror(transmit ? "write" : "read");
        close(fd);
        return EXIT_FAILURE;
    }

    close(fd);
    if (size != CAN_MTU || frame.len > CAN_MAX_DLEN) {
        fprintf(stderr, "Unexpected SocketCAN frame size\n");
        return EXIT_FAILURE;
    }

    printf("%03X#", frame.can_id & CAN_SFF_MASK);
    for (unsigned int i = 0; i < frame.len; ++i)
        printf("%02X", frame.data[i]);
    putchar('\n');
    return EXIT_SUCCESS;
}
