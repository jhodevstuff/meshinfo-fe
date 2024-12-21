<template>
  <div class="hover">
    <div class="hover__tile">
      <div class="hover__tile--icon"></div>
      <div class="hover__tile--label">Map</div>
    </div>
  </div>
</template>

<script setup>
// this is disabled because i had a better idea lol
</script>

<style lang="scss" scoped>

.hover {
  background-color: red;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;

  &__tile {
    background-color: blue;
    padding: 12px 16px;
    display: flex;
    gap: 10px;

    &--icon {
      width: 16px;
      height: 16px;
      background-image: url('../assets/icons/link.svg');
      background-repeat: no-repeat;
      background-size: 100%;
      background-position: center center;
    }
  }
}


</style>
