package com.khanago.grocery.user.service;

import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.security.SecurityUtils;
import com.khanago.grocery.user.Address;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.dto.AddressDto;
import com.khanago.grocery.user.dto.AddressUpsertDto;
import com.khanago.grocery.user.dto.ProfileDto;
import com.khanago.grocery.user.dto.UpdateProfileDto;
import com.khanago.grocery.user.repository.AddressRepository;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;

    public ProfileDto getProfile() {
        User user = currentUser();
        return new ProfileDto(user.getId(), user.getFullName(), user.getPhone(), user.getRoles().stream().map(r -> r.getName().name()).toList());
    }

    public ProfileDto updateProfile(UpdateProfileDto request) {
        User user = currentUser();
        user.setFullName(request.fullName().trim());
        userRepository.save(user);
        return new ProfileDto(user.getId(), user.getFullName(), user.getPhone(), user.getRoles().stream().map(r -> r.getName().name()).toList());
    }

    public List<AddressDto> listAddresses() {
        return addressRepository.findByUserId(SecurityUtils.getCurrentUserId()).stream().map(this::toAddressDto).toList();
    }

    public AddressDto addAddress(AddressUpsertDto request) {
        User user = currentUser();
        Address address = new Address();
        mapAddress(address, user, request);
        if (request.isDefault()) {
            clearDefaultAddress(user.getId());
        }
        return toAddressDto(addressRepository.save(address));
    }

    public AddressDto updateAddress(Long addressId, AddressUpsertDto request) {
        Address address = addressRepository.findById(addressId).orElseThrow(() -> new ApiException("Address not found"));
        if (!address.getUser().getId().equals(SecurityUtils.getCurrentUserId())) {
            throw new ApiException("You can only update your own address.");
        }

        mapAddress(address, address.getUser(), request);
        if (request.isDefault()) {
            clearDefaultAddress(address.getUser().getId());
            address.setDefault(true);
        }
        return toAddressDto(addressRepository.save(address));
    }

    public void deleteAddress(Long addressId) {
        Address address = addressRepository.findById(addressId).orElseThrow(() -> new ApiException("Address not found"));
        if (!address.getUser().getId().equals(SecurityUtils.getCurrentUserId())) {
            throw new ApiException("You can only delete your own address.");
        }
        addressRepository.delete(address);
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.getCurrentUserId()).orElseThrow(() -> new ApiException("User not found"));
    }

    private void clearDefaultAddress(Long userId) {
        List<Address> addresses = addressRepository.findByUserId(userId);
        addresses.forEach(a -> a.setDefault(false));
        addressRepository.saveAll(addresses);
    }

    private void mapAddress(Address address, User user, AddressUpsertDto request) {
        address.setUser(user);
        address.setLabel(request.label());
        address.setLine1(request.line1());
        address.setLine2(request.line2());
        address.setCity(request.city());
        address.setState(request.state());
        address.setPostalCode(request.postalCode());
        address.setLandmark(request.landmark());
        address.setLatitude(request.latitude());
        address.setLongitude(request.longitude());
        address.setDefault(request.isDefault());
    }

    private AddressDto toAddressDto(Address a) {
        return new AddressDto(a.getId(), a.getLabel(), a.getLine1(), a.getLine2(), a.getCity(), a.getState(), a.getPostalCode(),
                a.getLandmark(), a.getLatitude(), a.getLongitude(), a.isDefault());
    }
}
