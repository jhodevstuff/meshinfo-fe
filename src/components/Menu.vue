<template>
  <!-- <nav class="menu">
    <RouterLink class="menu__item" to="/">Mesh info</RouterLink>
    <RouterLink class="menu__item" to="/traceroute">Traceroutes</RouterLink>
  </nav> -->
  <div class="header">
    <div class="header__info">
      <h1 class="header__info--headline">meshinfo</h1>
      <p class="header__info--text">by Joshua Hoffmann</p>
    </div>
    <div class="header__logo"></div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { ref } from 'vue';

</script>

<style lang="scss" scoped>

.menu {
  padding: 36px 12px;
  display: flex;
  justify-content: center;
  background-color: #67ea94;

  &__item {
    padding: 12px 16px;
    font-weight: bold;
    font-size: 18px;
    text-decoration: none;
    color: #000;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 300ms ease-in-out;
  }
}

.router-link-active {
  border-bottom: 2px solid #000;
}

.header {
  padding: 6px 12px;
  padding-bottom: 10px;
  display: flex;
  justify-content: space-between;
  background-color: #67ea94;
  -webkit-box-shadow: 0px 5px 10px 2px rgba(103, 234, 148, 0.4);
    box-shadow: 0px 5px 10px 2px rgba(103, 234, 148, 0.4);

  &__info {
    color: #000;
    user-select: none;

    &--headline {
      font-size: 32px;
      margin: 6px 0;
      font-weight: bold;
    }

    &--text {
      font-size: 14px;
      display: none;
    }
  }

  &__logo {
    width: 80px;
    height: 100%x;
    background-image: url('../assets/meshtastic.svg');
    background-repeat: no-repeat;
    background-size: 100%;
    background-position: center center;
  }
}

</style>
