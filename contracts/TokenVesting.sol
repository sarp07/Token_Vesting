// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenVesting
 * @notice Belirlenen parametrelerle token kilitleme (vesting) işlemlerini yöneten kontrat.
 * Her vesting planı için: token, faydalanıcı, başlangıç zamanı, cliff süresi, toplam süre,
 * slice/dilim periyodu, toplam kilitlenecek miktar ve şu ana kadar çekilen miktar bilgileri tutulur.
 */
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    constructor() Ownable(msg.sender) {}
    
    struct VestingSchedule {
        bool initialized;            // Planın oluşturulup oluşturulmadığının kontrolü
        address beneficiary;         // Token'ları çekebilecek adres (faydalanıcı)
        IERC20 token;                // Kilitlenen token'un adresi
        uint8 decimals;              // Token'ın decimal değeri
        uint256 start;               // Vesting başlangıç zamanı (unix timestamp)
        uint256 cliff;               // Cliff zamanı (start + cliffDuration)
        uint256 duration;            // Toplam vesting süresi (saniye cinsinden)
        uint256 slicePeriodSeconds;  // Token'ların periyodik (dilim) olarak ne kadarının vadeye gireceği (saniye)
        uint256 totalAmount;         // Toplam kilitlenen token miktarı
        uint256 released;            // Şu ana kadar çekilen token miktarı
    }
    
    // Vesting planlarını, id -> VestingSchedule şeklinde tutuyoruz.
    mapping(bytes32 => VestingSchedule) private vestingSchedules;
    
    // Her faydalanıcının sahip olduğu vesting planı id'lerini saklayan mapping
    mapping(address => bytes32[]) private vestingSchedulesByBeneficiary;
    
    uint256 public vestingSchedulesCount; // Oluşturulan toplam vesting planı sayısı
    
    // Olaylar (event) ile işlemleri takip edelim
    event VestingScheduleCreated(
        bytes32 indexed vestingScheduleId,
        address indexed beneficiary,
        address token,
        uint8 decimals,
        uint256 totalAmount
    );
    event TokensReleased(
        bytes32 indexed vestingScheduleId,
        address indexed beneficiary,
        uint256 amount
    );
    
    /**
     * @notice Yeni bir vesting planı oluşturur.
     * @param tokenAddress Kilitlenecek token'un ERC20 adresi.
     * @param beneficiary Token'ları çekecek olan adres.
     * @param start Vesting işleminin başlayacağı unix timestamp.
     * @param cliffDuration Vesting başlangıcından itibaren çekim yapılamayacak süre (saniye).
     * @param duration Toplam vesting süresi (saniye).
     * @param slicePeriodSeconds Token'ların ne kadar periyotla (dilim) vadedileceği (saniye).
     * @param amount Kilitlenecek toplam token miktarı (token'ın kendi decimal'i ile).
     *
     * Dikkat: Bu fonksiyonu yalnızca kontrat sahibi (owner) çağırabilir.
     * Token'lar, kontrata aktarılmadan önce, bu kontrata transfer yetkisi (approve) verilmelidir.
     */
    function createVestingSchedule(
        address tokenAddress,
        address beneficiary,
        uint256 start,
        uint256 cliffDuration,
        uint256 duration,
        uint256 slicePeriodSeconds,
        uint256 amount
    ) external onlyOwner {
        require(duration > 0, "Duration must be > 0");
        require(amount > 0, "Amount must be > 0");
        require(slicePeriodSeconds >= 1, "Slice period must be >= 1");
        require(duration >= cliffDuration, "Duration must be >= cliff");
        
        IERC20 token = IERC20(tokenAddress);
        uint8 decimals = IERC20Metadata(tokenAddress).decimals();
        
        // Kilitlenecek token'ları kontrata aktarıyoruz.
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Her vesting planı için benzersiz bir id hesaplıyoruz.
        bytes32 vestingScheduleId = computeNextVestingScheduleId(beneficiary, tokenAddress, vestingSchedulesCount);
        
        uint256 cliff = start + cliffDuration;
        
        vestingSchedules[vestingScheduleId] = VestingSchedule({
            initialized: true,
            beneficiary: beneficiary,
            token: token,
            decimals: decimals,
            start: start,
            cliff: cliff,
            duration: duration,
            slicePeriodSeconds: slicePeriodSeconds,
            totalAmount: amount,
            released: 0
        });
        
        vestingSchedulesByBeneficiary[beneficiary].push(vestingScheduleId);
        vestingSchedulesCount++;
        
        emit VestingScheduleCreated(vestingScheduleId, beneficiary, tokenAddress, decimals, amount);
    }
    
    /**
     * @notice Faydalanıcının, o ana kadar vadedilmiş token'ları çekmesini sağlar.
     * @param vestingScheduleId Çekim yapılacak vesting planının id'si.
     * @param amount Çekilmek istenen token miktarı.
     */
    function release(bytes32 vestingScheduleId, uint256 amount) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[vestingScheduleId];
        require(schedule.initialized, "Vesting schedule does not exist");
        require(msg.sender == schedule.beneficiary, "Only beneficiary can release tokens");
        
        uint256 vestedAmount = computeReleasableAmount(vestingScheduleId);
        require(vestedAmount >= amount, "Not enough vested tokens");
        
        schedule.released += amount;
        schedule.token.safeTransfer(schedule.beneficiary, amount);
        
        emit TokensReleased(vestingScheduleId, schedule.beneficiary, amount);
    }
    
    /**
     * @notice Hesaplar: Şu ana kadar vadedilmiş ancak henüz çekilmemiş token miktarı.
     * @param vestingScheduleId İncelenen vesting planı id'si.
     * @return Releasable miktar.
     */
    function computeReleasableAmount(bytes32 vestingScheduleId) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[vestingScheduleId];
        // Cliff süresi dolmamışsa, hiç token vadedilmemiştir.
        if (block.timestamp < schedule.cliff) {
            return 0;
        } else if (block.timestamp >= schedule.start + schedule.duration) {
            // Tüm vesting süresi geçtiyse, kalan tüm miktar vadedilmiştir.
            return schedule.totalAmount - schedule.released;
        } else {
            // Linear vesting (slice/dilim bazlı)
            uint256 timeFromStart = block.timestamp - schedule.start;
            uint256 vestedSlicePeriods = timeFromStart / schedule.slicePeriodSeconds;
            uint256 vestedSeconds = vestedSlicePeriods * schedule.slicePeriodSeconds;
            uint256 vestedAmount = (schedule.totalAmount * vestedSeconds) / schedule.duration;
            return vestedAmount - schedule.released;
        }
    }
    
    /**
     * @notice Verilen vesting planı için faydalanıcının bir sonraki çekim tarihini hesaplar.
     * @param vestingScheduleId İncelenen vesting planı id'si.
     * @return Bir sonraki çekim tarihi (unix timestamp). Vesting tamamlandıysa 0 döner.
     */
    function getNextWithdrawalDate(bytes32 vestingScheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[vestingScheduleId];
        if (block.timestamp < schedule.cliff) {
            return schedule.cliff;
        } else if (block.timestamp >= schedule.start + schedule.duration) {
            return 0;
        } else {
            uint256 timeFromStart = block.timestamp - schedule.start;
            uint256 currentSlice = timeFromStart / schedule.slicePeriodSeconds;
            uint256 nextWithdrawal = schedule.start + ((currentSlice + 1) * schedule.slicePeriodSeconds);
            if (nextWithdrawal > schedule.start + schedule.duration) {
                nextWithdrawal = schedule.start + schedule.duration;
            }
            return nextWithdrawal;
        }
    }
    
    /**
     * @notice Belirli bir faydalanıcıya ait tüm vesting planı id'lerini döner.
     * @param beneficiary Faydalanıcının adresi.
     * @return Vesting planı id'lerinin dizisi.
     */
    function getVestingSchedulesByBeneficiary(address beneficiary) external view returns (bytes32[] memory) {
        return vestingSchedulesByBeneficiary[beneficiary];
    }
    
    /**
     * @notice Belirli bir vesting planına ait tüm bilgileri döner.
     * @param vestingScheduleId İncelenen vesting planı id'si.
     * @return VestingSchedule yapısı.
     */
    function getVestingSchedule(bytes32 vestingScheduleId) external view returns (VestingSchedule memory) {
        return vestingSchedules[vestingScheduleId];
    }
    
    /**
     * @notice Vesting planı için benzersiz id oluşturur.
     * @param beneficiary Faydalanıcı adresi.
     * @param tokenAddress Kilitlenen token'un adresi.
     * @param index Şu anki vesting planı sayısı.
     * @return Oluşturulan vesting planı id'si.
     */
    function computeNextVestingScheduleId(
        address beneficiary,
        address tokenAddress,
        uint256 index
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(index, beneficiary, tokenAddress, block.timestamp));
    }
    
    /**
     * @notice Acil durumlarda, sözleşmede bulunan token'ların admin (owner) tarafından çekilmesini sağlar.
     * @param tokenAddress Çekilecek token'un ERC20 adresi.
     * @param amount Çekilecek token miktarı.
     *
     * Dikkat: Bu fonksiyon, vesting planlarına bakmadan sözleşmede bulunan token'ların çekilmesine olanak tanır.
     * Bu nedenle yalnızca acil durumlarda ve güvenilir yönetici tarafından kullanılmalıdır.
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyOwner nonReentrant {
        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
    }
}